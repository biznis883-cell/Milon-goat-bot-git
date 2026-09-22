const { getStreamFromURL } = require("../../../utils/log.js");

module.exports = {
	config: {
		name: "uptime",
		aliases: ["up", "upt"],
		version: "3.0",
		author: "Bassit Bot",
		role: 0,
		shortDescription: {
			en: "Check bot uptime"
		},
		longDescription: {
			en: "Show how long the bot has been running"
		},
		category: "system",
		guide: {
			en: "{pn} - Check bot uptime"
		}
	},

	onStart() {
		console.log("✅ Uptime command loaded.");
	},

	onChat: async function ({ event, message, commandName }) {
		const prefix = global.GoatBot?.config?.prefix || "/";

		const rawBody = (event.body || "").trim();
		if (!rawBody) return;

		const body = rawBody.toLowerCase();

		const names = [
			commandName,
			...(this.config.aliases || [])
		].map(n => String(n).toLowerCase());

		const isTrigger = names.some(name =>
			body === name ||
			body === prefix + name ||
			body.startsWith(name + " ") ||
			body.startsWith(prefix + name + " ")
		);

		if (!isTrigger) return;

		try {
			// حساب Ping
			const start = Date.now();

			const pingMsg = await message.reply("⚡ Checking uptime...");

			const ping = Date.now() - start;

			// حساب Uptime الحقيقي
			const uptime = Math.floor(process.uptime());

			const days = Math.floor(uptime / 86400);
			const hours = Math.floor((uptime % 86400) / 3600);
			const minutes = Math.floor((uptime % 3600) / 60);
			const seconds = uptime % 60;

			const upTimeStr =
				`${days}d ${hours}h ${minutes}m ${seconds}s`;

			// الصورة المباشرة
			const imageURL =
				"https://i.postimg.cc/Wp1fT2j5/file-00000000c00881fb9c3f582acdcc3fb2.png";

			// حذف رسالة Checking
			try {
				await message.unsend(pingMsg.messageID);
			} catch (e) {}

			// إرسال النتيجة
			return message.reply({
				body:
`╭━━━━━━━━━━━━━━━━━━╮
        ✦ 𝐁𝐀𝐒𝐒𝐈𝐓 𝐁𝐎𝐓 ✦
╰━━━━━━━━━━━━━━━━━━╯

╭─╼━━━━━━━━━━━━╾─╮
│ 🟢 Status : ONLINE
│ ⏱️ Uptime : ${upTimeStr}
│ ⚡ Ping : ${ping}ms
│ 🤖 Bot : BASSIT BOT
╰─━━━━━━━━━━━━━╾─╯

      💗 𝐀𝐋𝐖𝐀𝐘𝐒 𝐎𝐍𝐋𝐈𝐍𝐄 💗`,

				attachment: await getStreamFromURL(imageURL)
			});

		} catch (err) {
			console.error("❌ Uptime Error:", err);
			return message.reply(
				"⚠️ حدث خطأ أثناء جلب معلومات Uptime."
			);
		}
	}
};
