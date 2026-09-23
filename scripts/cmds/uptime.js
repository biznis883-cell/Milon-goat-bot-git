const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const os = require("os");
const path = require("path");

const IMAGE_FILES = ["uptime_pink.png", "uptime_blue.png"];

module.exports = {
  config: {
    name: "uptime",
    aliases: ["up", "upt"],
    version: "3.0",
    author: "Milon",
    role: 0,
    shortDescription: { en: "Show bot uptime with a random status image" },
    longDescription: { en: "Display live uptime, ping and memory usage on a random status image" },
    category: "system",
    guide: { en: "{pn} → show bot uptime, ping and memory usage" }
  },

  onStart: async function (context) {
    return sendStatus(context);
  },

  onChat: async function (context) {
    const { event } = context;
    const body = String(event.body || "").trim().toLowerCase();
    if (!body || !isOwner(event.senderID))
      return;

    const prefix = getPrefix(event.threadID);
    const names = ["up", "uptime", "upt"];
    const isBareCommand = names.some(name => body === name);
    const isPrefixedCommand = names.some(name => body === `${prefix}${name}`);

    // Prefixed commands are handled by onStart; only support bare "up" for the owner here.
    if (isBareCommand && !isPrefixedCommand)
      return sendStatus(context);
  }
};

async function sendStatus({ message, event }) {
  const cacheDir = path.join(__dirname, "cache");
  fs.mkdirSync(cacheDir, { recursive: true });

    const imageFile = getImageFile(event);
  const sourcePath = path.join(__dirname, imageFile);
  const outputPath = path.join(cacheDir, `uptime_${Date.now()}_${Math.floor(Math.random() * 10000)}.png`);
  let pingMessage;
  let outputStream;

  try {
    const pingStart = Date.now();
    pingMessage = await message.reply("⏳ جاري تجهيز معلومات البوت...");
    const ping = Math.max(1, Date.now() - pingStart);

    const uptime = formatUptime(process.uptime());
    const memory = getMemoryUsage();
    const image = await loadImage(sourcePath);
    const canvas = createCanvas(image.width, image.height);
    const ctx = canvas.getContext("2d");

    ctx.drawImage(image, 0, 0, image.width, image.height);
    drawLiveValues(ctx, {
      width: image.width,
      uptime,
      ping: `${ping}ms`,
      memory: `${memory}%`
    });

    fs.writeFileSync(outputPath, canvas.toBuffer("image/png"));

    if (pingMessage?.messageID && typeof message.unsend === "function") {
      try {
        await message.unsend(pingMessage.messageID);
      } catch (_) {}
    }

    outputStream = fs.createReadStream(outputPath);
    const cleanupOutput = () => {
      if (fs.existsSync(outputPath)) {
        try {
          fs.unlinkSync(outputPath);
        } catch (_) {}
      }
    };
    outputStream.once("close", cleanupOutput);
    outputStream.once("error", cleanupOutput);
    const cleanupTimer = setTimeout(cleanupOutput, 120000);
    cleanupTimer.unref?.();

    return message.reply({
      body: `✅ البوت خدام\n⏱️ Uptime: ${uptime}\n⚡ Ping: ${ping}ms\n🧠 Memory: ${memory}%`,
      attachment: outputStream
    });
  } catch (error) {
    console.error("[uptime] Failed to generate status image:", error);
    return message.reply("❌ ما قدرتش نجهز صورة حالة البوت دابا.");
  } finally {
    if (!outputStream && fs.existsSync(outputPath)) {
      try {
        fs.unlinkSync(outputPath);
      } catch (_) {}
    }
  }
}

function drawLiveValues(ctx, { width, uptime, ping, memory }) {
  const scale = width / 1536;
  ctx.save();
  ctx.scale(scale, scale);

  // Hide only the old sample values while preserving the labels and decorations.
  ctx.fillStyle = "rgba(7, 6, 16, 0.96)";
  ctx.fillRect(510, 454, 650, 116);
  ctx.fillRect(92, 704, 355, 82);
  ctx.fillRect(492, 704, 320, 82);
  ctx.fillRect(855, 704, 300, 82);
  ctx.fillRect(1190, 704, 285, 82);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.shadowBlur = 5;

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${fitFontSize(ctx, uptime, 82, 620)}px Arial`;
  ctx.fillText(uptime, 548, 526);

  ctx.textAlign = "center";
  ctx.font = "bold 31px Arial";
  ctx.fillText(shortUptime(uptime), 270, 748);
  ctx.fillText("Online", 650, 748);
  ctx.fillText(ping, 1005, 748);
  ctx.fillText(memory, 1333, 748);

  ctx.restore();
}

function fitFontSize(ctx, text, initialSize, maxWidth) {
  let size = initialSize;
  while (size > 42) {
    ctx.font = `bold ${size}px Arial`;
    if (ctx.measureText(text).width <= maxWidth)
      break;
    size -= 2;
  }
  return size;
}

function shortUptime(value) {
  return value
    .replace(/\s+\d+s$/, "")
    .replace(/\s+/g, " ");
}

function formatUptime(seconds) {
  const total = Math.floor(seconds);
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

function getMemoryUsage() {
  const memory = process.memoryUsage();
  const totalMemory = os.totalmem();
  return Math.min(99, Math.max(1, Math.round((memory.rss / totalMemory) * 100)));
}

function getPrefix(threadID) {
  if (typeof global.utils?.getPrefix === "function")
    return global.utils.getPrefix(threadID);
  return global.GoatBot?.config?.prefix || "/";
}

function getImageFile(event) {
  const body = String(event.body || "").trim().toLowerCase().split(/\s+/)[0];
  const prefix = getPrefix(event.threadID);
  const invokedName = body.startsWith(prefix) ? body.slice(prefix.length) : body;

  // Keep the requested "uptime" card pink; "up" and "upt" rotate both cards.
  if (invokedName === "uptime")
    return "uptime_pink.png";
  return IMAGE_FILES[Math.floor(Math.random() * IMAGE_FILES.length)];
}

function isOwner(userID) {
  const adminBotIDs = (global.GoatBot?.config?.adminBot || [])
    .map(id => String(id))
    .filter(Boolean);
  return adminBotIDs.includes(String(userID));
}