const { getPrefix } = global.utils;
const { commands } = global.GoatBot;

function getRequiredRole(command) {
	const role = command?.config?.role;

	if (typeof role === "number")
		return role;

	if (role && typeof role === "object") {
		const roles = Object.values(role)
			.map(Number)
			.filter(Number.isFinite);

		return roles.length ? Math.max(...roles) : 0;
	}

	return 0;
}

function getRoleName(role) {
	if (role === 0) return "👤 User";
	if (role === 1) return "👑 Group Admin";
	if (role === 2) return "🤖 Bot Admin";
	return "❓ Unknown";
}

function findCommand(name) {
	name = name.toLowerCase();

	for (const [, command] of commands) {
		const config = command?.config;
		if (!config) continue;

		if (String(config.name).toLowerCase() === name)
			return command;

		const aliases = config.aliases || [];

		if (
			Array.isArray(aliases) &&
			aliases.some(alias =>
				String(alias).toLowerCase() === name
			)
		) {
			return command;
		}
	}

	return null;
}

module.exports = {
	config: {
		name: "help",
		aliases: ["menu", "commands"],
		version: "3.0",
		author: "Bassit Bot",
		role: 0,
		category: "info",

		shortDescription: {
			en: "Show bot commands"
		},

		longDescription: {
			en: "Show all available bot commands"
		},

		guide: {
			en: "{pn} or {pn} <command>"
		}
	},

	onStart: async function ({
		message,
		args,
		event,
		role
	}) {

		const prefix = getPrefix(event.threadID);
		const input = args.join(" ").trim();

		// =========================
		// COMMAND INFORMATION
		// =========================

		if (input) {

			const command = findCommand(input);

			if (!command) {
				return message.reply(
					`❌ الأمر "${input}" غير موجود.`
				);
			}

			const c = command.config;

			let guide = "No usage guide";

			if (c.guide) {

				if (typeof c.guide === "object") {
					guide =
						c.guide.en ||
						Object.values(c.guide)[0];
				} else {
					guide = c.guide;
				}

				guide = String(guide)
					.replace(
						/{pn}/g,
						`${prefix}${c.name}`
					);
			}

			const info =
`╭━━━━━━━━━━━━━━━━━━╮
│   📖 𝐂𝐎𝐌𝐌𝐀𝐍𝐃 𝐈𝐍𝐅𝐎
╰━━━━━━━━━━━━━━━━━━╯

📝 Name : ${c.name}

📚 Description :
${c.longDescription || c.shortDescription || "N/A"}

⚡ Usage :
${guide}

📂 Category :
${c.category || "Uncategorized"}

⏱️ Cooldown :
${c.countDown || 5}s

🔐 Permission :
${getRoleName(getRequiredRole(command))}

👤 Author :
${c.author || "Bassit Bot"}

━━━━━━━━━━━━━━━━━━━━`;

			return message.reply(info);
		}

		// =========================
		// COMMAND LIST
		// =========================

		const userCommands = [];
		const adminCommands = [];
		const botAdminCommands = [];

		for (const [name, command] of commands) {

			if (!command?.config)
				continue;

			const requiredRole =
				getRequiredRole(command);

			if (requiredRole > role)
				continue;

			const commandName =
				command.config.name || name;

			if (requiredRole === 0) {

				userCommands.push(commandName);

			} else if (requiredRole === 1) {

				adminCommands.push(commandName);

			} else {

				botAdminCommands.push(commandName);

			}
		}

		userCommands.sort();
		adminCommands.sort();
		botAdminCommands.sort();

		const total =
			userCommands.length +
			adminCommands.length +
			botAdminCommands.length;

		// =========================
		// BUILD MENU
		// =========================

		let msg = "";

		msg +=
`╭━━━━━━━━━━━━━━━━━━━━╮
│   📜 𝐁𝐀𝐒𝐒𝐈𝐓 𝐁𝐎𝐓
│      𝐂𝐎𝐌𝐌𝐀𝐍𝐃𝐒
╰━━━━━━━━━━━━━━━━━━━━╯

🤖 Bot : BASSIT BOT
📌 Prefix : ${prefix}
📚 Total Commands : ${total}

━━━━━━━━━━━━━━━━━━━━
        👤 𝐔𝐒𝐄𝐑
━━━━━━━━━━━━━━━━━━━━

`;

		if (userCommands.length) {

			msg += userCommands
				.map((cmd, index) =>
					`${index + 1}. ${prefix}${cmd}`
				)
				.join("\n");

		} else {

			msg += "لا توجد أوامر.";
		}

		if (adminCommands.length) {

			msg +=
`

━━━━━━━━━━━━━━━━━━━━
        👑 𝐀𝐃𝐌𝐈𝐍
━━━━━━━━━━━━━━━━━━━━

`;

			msg += adminCommands
				.map((cmd, index) =>
					`${index + 1}. ${prefix}${cmd}`
				)
				.join("\n");
		}

		if (botAdminCommands.length) {

			msg +=
`

━━━━━━━━━━━━━━━━━━━━
        🤖 𝐁𝐎𝐓 𝐀𝐃𝐌𝐈𝐍
━━━━━━━━━━━━━━━━━━━━

`;

			msg += botAdminCommands
				.map((cmd, index) =>
					`${index + 1}. ${prefix}${cmd}`
				)
				.join("\n");
		}

		msg +=
`

━━━━━━━━━━━━━━━━━━━━
💡 ${prefix}help <command>
📖 لمعرفة تفاصيل أي أمر
━━━━━━━━━━━━━━━━━━━━`;

		return message.reply(msg);
	}
};
