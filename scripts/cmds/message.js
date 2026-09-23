const fs = require("fs");
const { client } = global;
const { config } = global.GoatBot;

module.exports = {
  config: {
    name: "message",
    aliases: ["msg"],
    version: "1.0",
    author: "Milon",
    countDown: 5,
    role: 2,
    description: {
      en: "Turn bot messages on or off for non-bot-admins"
    },
    category: "owner",
    guide: {
      en: "{pn} on: allow the bot to reply normally"
        + "\n{pn} off: silence the bot for everyone except bot admins"
    }
  },

  langs: {
    en: {
      turnedOn: "✅ Message mode is ON. The bot can reply normally again.",
      turnedOff: "🔇 Message mode is OFF. Only bot admins can receive bot replies.",
      syntax: "⚠️ Use: {pn} on or {pn} off"
    },
    vi: {
      turnedOn: "✅ Đã bật lại chế độ trả lời của bot.",
      turnedOff: "🔇 Đã tắt trả lời. Chỉ admin bot mới nhận được phản hồi.",
      syntax: "⚠️ Sử dụng: {pn} on hoặc {pn} off"
    }
  },

  onStart: function ({ args, message, getLang }) {
    const value = String(args[0] || "").toLowerCase();
    if (value !== "on" && value !== "off")
      return message.reply(getLang("syntax").replace("{pn}", `${config.prefix || "."}message`));

    config.messageMode = value === "on";
    fs.writeFileSync(client.dirConfig, JSON.stringify(config, null, 2));
    return message.reply(getLang(config.messageMode ? "turnedOn" : "turnedOff"));
  }
};