const a = require("axios");
const nix = "https://raw.githubusercontent.com/aryannix/stuffs/master/raw/apis.json";
const AI_COST = 5;

if (!global.temp)
  global.temp = {};
if (!global.temp.geminiUsing)
  global.temp.geminiUsing = {};

module.exports = {
  config: {
    name: "gemini",
    aliases: ["ai","chat"],
    version: "0.0.1",
    author: "ArYAN",
    countDown: 3,
    role: 0,
    shortDescription: "Ask Gemini AI",
    longDescription: "Talk with Gemini AI using Aryan's updated API",
    category: "AI",
    guide: "/gemini [your question]"
  },

  onStart: async function({ api, event, args, usersData, commandName }) {
    const p = args.join(" ").trim();
    if (!p)
      return api.sendMessage("❌ Please provide a question or prompt.", event.threadID, event.messageID);

    let e;
    try {
      const apiConfig = await a.get(nix);
      e = apiConfig.data && apiConfig.data.api;
      if (!e) throw new Error("Configuration Error: Missing API in GitHub JSON.");
    } catch (error) {
      api.sendMessage("❌ Failed to fetch API configuration from GitHub.", event.threadID, event.messageID);
      return;
    }

    return askGemini({ api, event, usersData, prompt: p, baseApi: e, commandName });
  },

  onReply: async function({ api, event, Reply, usersData, commandName }) {
    if (String(api.getCurrentUserID()) === String(event.senderID)) return;
    const { baseApi: e } = Reply;
    if (!e) return api.sendMessage("❌ Session expired. Please start a new conversation.", event.threadID, event.messageID);

    const p = String(event.body || "").trim();
    if (!p) return;

    return askGemini({ api, event, usersData, prompt: p, baseApi: e, commandName });
  }
};

async function askGemini({ api, event, usersData, prompt, baseApi, commandName }) {
  const userID = String(event.senderID);
  if (global.temp.geminiUsing[userID])
    return api.sendMessage("⏳ Your previous AI request is still processing. Please wait.", event.threadID, event.messageID);

  const reservation = await reserveCredit(usersData, userID);
  if (!reservation.ok)
    return api.sendMessage(`💰 You need ${AI_COST} coins for AI.\nYour balance: ${reservation.balance}`, event.threadID, event.messageID);

  global.temp.geminiUsing[userID] = true;
  api.setMessageReaction("⏳", event.messageID, () => {}, true);

  try {
    const response = await a.get(`${baseApi}/gemini?prompt=${encodeURIComponent(prompt)}`);
    const reply = response.data?.response;
    if (!reply) throw new Error("No response from Gemini API.");

    api.setMessageReaction("✅", event.messageID, () => {}, true);
    return api.sendMessage(
      `${reply}\n\n💳 AI cost: ${AI_COST} coins | Balance: ${reservation.balance}`,
      event.threadID,
      (err, info) => {
        if (!err && info?.messageID) {
          global.GoatBot.onReply.set(info.messageID, {
            commandName,
            author: event.senderID,
            baseApi
          });
        }
      },
      event.messageID
    );
  } catch (error) {
    await refundCredit(usersData, userID);
    api.setMessageReaction("❌", event.messageID, () => {}, true);
    console.error("[gemini] Request failed:", error.message);
    return api.sendMessage("⚠️ AI did not respond, so no coins were charged.", event.threadID, event.messageID);
  } finally {
    delete global.temp.geminiUsing[userID];
  }
}

async function reserveCredit(usersData, userID) {
  const userData = await usersData.get(userID);
  const balance = Number(userData?.money) || 0;
  if (balance < AI_COST)
    return { ok: false, balance };

  await usersData.set(userID, { money: balance - AI_COST });
  return { ok: true, balance: balance - AI_COST };
}

async function refundCredit(usersData, userID) {
  const userData = await usersData.get(userID);
  const balance = Number(userData?.money) || 0;
  await usersData.set(userID, { money: balance + AI_COST });
}
