const axios = require("axios");
const fs = require("fs-extra");
const path = require("path");

const SEARCH_API = "https://betadash-search-download.vercel.app/yt";
const DOWNLOAD_API = "https://yt-mp3-imran.vercel.app/api";
const YOUTUBE_URL = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)[\w-]{6,}/i;

module.exports.config = {
  name: "sing",
  aliases: ["music"],
  version: "2.0.0",
  author: "Milon",
  role: 0,
  shortDescription: "Search and download MP3 songs",
  longDescription: "Search YouTube songs, download them as MP3, or use a YouTube link.",
  category: "media",
  countDown: 7,
  guide: {
    en: "{pn} <song name>\n{pn} <YouTube URL>\nReply with a number to download a search result."
  }
};

module.exports.onStart = async function ({ message, event, args }) {
  const reply = event.messageReply;
  const replyUrl = extractYoutubeUrl(reply?.body);
  const requestedUrl = extractYoutubeUrl(args.join(" "));
  const infoMode = args[0]?.toLowerCase() === "-info";

  if (replyUrl && (infoMode || !args.length))
    return infoMode ? showInfo(message, event, replyUrl) : downloadSong(message, event, replyUrl);

  if (requestedUrl)
    return infoMode ? showInfo(message, event, requestedUrl) : downloadSong(message, event, requestedUrl);

  if (reply?.attachments?.length && !args.length)
    return message.reply("⚠️ Reply with a song name or a YouTube link. Direct audio recognition is not available right now.");

  const query = (infoMode ? args.slice(1) : args).join(" ").trim();
  if (!query)
    return message.reply("❌ Please provide a song name or YouTube URL.");

  return searchSong(message, event, query);
};

module.exports.onReply = async function ({ event, message, Reply }) {
  if (String(event.senderID) !== String(Reply.author))
    return;

  const choice = Number.parseInt(String(event.body || "").trim(), 10);
  if (!Number.isInteger(choice) || choice < 1 || choice > Reply.results.length)
    return message.reply(`❌ Reply with a number between 1 and ${Reply.results.length}.`);

  const selected = Reply.results[choice - 1];
  await message.unsend(Reply.messageID);
  return downloadSong(message, event, selected.url, selected.title, selected.time);
};

async function searchSong(message, event, query) {
  await setReaction(message, event, "⏳");

  try {
    const response = await axios.get(SEARCH_API, {
      params: { search: query },
      timeout: 20000
    });
    const results = (Array.isArray(response.data) ? response.data : [])
      .filter(item => item?.url && item?.title)
      .slice(0, 10);

    if (!results.length)
      return message.reply("❌ No songs found. Try another search.");

    const body = results
      .map((item, index) => `${index + 1}. ${item.title}\n   ⏱️ ${item.time || "Unknown duration"}`)
      .join("\n\n");

    const sent = await message.reply({
      body: `🎵 Search results for: ${query}\n\n${body}\n\n↩️ Reply with a number to download.`
    });

    if (sent?.messageID) {
      global.GoatBot.onReply.set(sent.messageID, {
        commandName: module.exports.config.name,
        messageID: sent.messageID,
        author: event.senderID,
        results
      });
    }
    await setReaction(message, event, "✅");
  }
  catch (error) {
    await setReaction(message, event, "❌");
    console.error("[sing] Search failed:", error.message);
    return message.reply("❌ Search is temporarily unavailable. Please try again later.");
  }
}

async function downloadSong(message, event, url, fallbackTitle = "YouTube Audio", duration = "") {
  await setReaction(message, event, "⏳");
  const cacheDir = path.join(__dirname, "cache");
  await fs.ensureDir(cacheDir);
  const filePath = path.join(cacheDir, `sing_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp3`);

  try {
    const downloadResponse = await axios.get(DOWNLOAD_API, {
      params: { url },
      timeout: 30000
    });
    const downloadUrl = downloadResponse.data?.downloadUrl || downloadResponse.data?.download_url;
    const title = downloadResponse.data?.info?.title || fallbackTitle;

    if (!downloadUrl)
      throw new Error("Download link not found");

    const file = await axios.get(downloadUrl, {
      responseType: "arraybuffer",
      timeout: 60000
    });
    await fs.writeFile(filePath, file.data);

    await setReaction(message, event, "✅");
    await message.reply({
      body: `✅ ${title}\n⏱️ ${duration || "Audio"}`,
      attachment: fs.createReadStream(filePath)
    });
  }
  catch (error) {
    await setReaction(message, event, "❌");
    console.error("[sing] Download failed:", error.message);
    return message.reply("❌ I couldn't download this song. Try another link or search.");
  }
  finally {
    await fs.remove(filePath).catch(() => {});
  }
}

async function showInfo(message, event, url) {
  try {
    const response = await axios.get(DOWNLOAD_API, {
      params: { url },
      timeout: 30000
    });
    const info = response.data?.info;
    if (!info?.title)
      throw new Error("Video information not found");

    return message.reply(
      `🎵 ${info.title}\n` +
      `👤 Author: ${info.author || "Unknown"}\n` +
      `🔗 ${url}`
    );
  }
  catch (error) {
    console.error("[sing] Info lookup failed:", error.message);
    return message.reply("❌ I couldn't read information for this YouTube link.");
  }
}

function extractYoutubeUrl(text = "") {
  const match = String(text).match(YOUTUBE_URL);
  return match ? match[0].replace(/[),.]+$/, "") : null;
}

async function setReaction(message, event, emoji) {
  try {
    await message.reaction(emoji, event.messageID);
  }
  catch (error) {
    console.error("[sing] Reaction failed:", error.message);
  }
}