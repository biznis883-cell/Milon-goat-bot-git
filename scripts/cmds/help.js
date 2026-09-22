const axios = require("axios");
const { getPrefix } = global.utils;
const { commands } = global.GoatBot;

let xfont = null;
let yfont = null;

async function loadResources() {
  try {
    const [x, y] = await Promise.all([
      axios.get("https://raw.githubusercontent.com/Saim-x69x/sakura/main/xfont.json"),
      axios.get("https://raw.githubusercontent.com/Saim-x69x/sakura/main/yfont.json")
    ]);
    xfont = x.data;
    yfont = y.data;
  } catch (e) {
    console.error("[HELP] Resource load failed");
  }
}

function fontConvert(text, type = "command") {
  const map = type === "category" ? xfont : yfont;
  if (!map) return text;
  return text.split("").map(c => map[c] || c).join("");
}

function roleText(role) {
  if (typeof role !== "number") {
    role = getRequiredRole({ config: { role } });
  }

  if (role === 0) return "👤 User";
  if (role === 1) return "👑 Group Admin";
  if (role === 2) return "🤖 Bot Admin";
  return "Unknown";
}

function getRequiredRole(command) {
  const configuredRole = command?.config?.role;

  if (typeof configuredRole === "number") return configuredRole;

  if (configuredRole && typeof configuredRole === "object") {
    const roles = Object.values(configuredRole)
      .filter(value => Number.isFinite(Number(value)))
      .map(Number);

    return roles.length ? Math.max(...roles) : 0;
  }

  return 0;
}

function findCommand(name) {
  name = name.toLowerCase();
  for (const [, cmd] of commands) {
    const a = cmd.config?.aliases;
    if (cmd.config?.name === name) return cmd;
    if (Array.isArray(a) && a.includes(name)) return cmd;
    if (typeof a === "string" && a === name) return cmd;
  }
  return null;
}

function formatCommandRows(commandNames) {
  const rows = [];
  const columnWidth = 30;

  for (let i = 0; i < commandNames.length; i += 2) {
    const left = `𝘾𝙢𝙙. ${fontConvert(commandNames[i])}`;
    const right = commandNames[i + 1]
      ? `𝘾𝙢𝙙. ${fontConvert(commandNames[i + 1])}`
      : "";

    rows.push(`${left.padEnd(columnWidth)}${right}`.trimEnd());
  }

  return rows.join("\n") || "— لا توجد أوامر متاحة —";
}

module.exports = {
  config: {
    name: "help",
    aliases: ["menu"],
    version: "2.5",
    author: "Saimx69x | fixed milon",
    role: 0,
    category: "info",
    shortDescription: "Show all commands in one list",
    guide: {
      en: "{pn} or {pn} [command]"
    }
  },

  onStart: async function ({ message, args, event, role }) {
    if (!xfont || !yfont) await loadResources();

    const prefix = getPrefix(event.threadID);
    const input = args.join(" ").trim();

    /* ───── Single Command Info View ───── */
    if (input) {
      const cmd = findCommand(input);
      if (cmd) {
        const c = cmd.config;
        let usage = "No usage guide";
        if (c.guide) {
          usage = typeof c.guide === "object" ? (c.guide.en || Object.values(c.guide)[0]) : c.guide;
          usage = usage.replace(/{pn}/g, `${prefix}${c.name}`);
        }

        const infoMsg = `⚡️ 𝗖𝗢𝗠𝗠𝗔𝗡𝗗 𝗜𝗡𝗙𝗢 ⚡️
━━━━━━━━━━━━━━━━━━
🗡️ 𝗡𝗮𝗺𝗲 » ${c.name}
📝 𝗗𝗲𝘀𝗰 » ${c.longDescription || c.shortDescription || "N/A"}
🧩 𝗨𝘀𝗮𝗴𝗲 » ${usage}
📦 𝗖𝗮𝘁𝗲𝗴𝗼𝗿𝘆 » ${(c.category || "UNCATEGORIZED").toUpperCase()}
⏱️ 𝗖𝗼𝗼𝗹𝗱𝗼𝘄𝗻 » ${c.countDown || 5}s
🔒 𝗣𝗲𝗿𝗺𝗶𝘀𝘀𝗶𝗼𝗻 » ${roleText(c.role)}
✨ 𝗖𝗿𝗲𝗱𝗶𝘁𝘀 » ${c.author || "𝗠𝗶𝗹𝗼𝗻 𝗛𝗮𝘀𝗮𝗻"}`;

        return message.reply(infoMsg);
      }
    }

    /* ───── Professional Commands List ───── */
    const basicCommands = [];
    const botCommands = [];

    for (const [name, cmd] of commands) {
      if (!cmd?.config) continue;

      const requiredRole = getRequiredRole(cmd);
      if (requiredRole > role) continue;

      const commandName = cmd.config.name || name;
      if (requiredRole === 0) basicCommands.push(commandName);
      else botCommands.push(commandName);
    }

    basicCommands.sort((a, b) => a.localeCompare(b));
    botCommands.sort((a, b) => a.localeCompare(b));

    const totalCmds = basicCommands.length + botCommands.length;
    let msg = `╭──────────────╮\n`;
    msg += `│ 𝙈𝙄𝙇𝙊𝙉 𝘽𝙊𝙏 𝙈𝙀𝙉𝙐 │\n`;
    msg += `╰──────────────╯\n\n`;
    msg += `📌 𝙋𝙧𝙚𝙛𝙞𝙭: ${prefix}\n`;
    msg += `📚 𝙏𝙤𝙩𝙖𝙡: ${totalCmds} 𝙘𝙤𝙢𝙢𝙖𝙣𝙙𝙨\n\n`;
    msg += `▬▬▬𝘽𝘼𝙎𝙎𝙀𝙏▬▬▬\n\n`;
    msg += `${formatCommandRows(basicCommands)}\n\n`;
    msg += `▬▬▬▬▬ 𝘽𝙊𝙏▬▬▬▬\n\n`;
    msg += `${formatCommandRows(botCommands)}\n\n`;
    msg += `━━━━━━━━━━━━━━━━━━━━\n`;
    msg += `💡 ${prefix}help <command> لمعرفة تفاصيل أي أمر`;

    return message.reply(msg);
  }
};
