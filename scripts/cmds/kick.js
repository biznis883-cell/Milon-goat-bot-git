module.exports = {
	config: {
		name: "kick",
		version: "1.3",
		author: "NTKhang",
		countDown: 5,
		role: 1,
		description: {
			vi: "Kick thành viên khỏi box chat",
			en: "Kick member out of chat box"
		},
		category: "box chat",
		guide: {
			vi: "   {pn} @tags: dùng để kick những người được tag",
			en: "   {pn} @tags: use to kick members who are tagged"
		}
	},

	langs: {
		vi: {
			needAdmin: "Vui lòng thêm quản trị viên cho bot trước khi sử dụng tính năng này"
		},
		en: {
			needAdmin: "❌ The bot must be a group admin before it can remove members.",
			noTarget: "⚠️ Tag a member or reply to their message.",
			cannotKickAdmin: "⚠️ I can't remove a group admin: %1",
			success: "✅ Removed %1 member(s) from the group.",
			failed: "❌ Could not remove %1 member(s). Make sure the bot is still a group admin."
		}
	},

	onStart: async function ({ message, event, args, threadsData, api, getLang }) {
		const threadData = await threadsData.get(event.threadID);
		const adminIDs = (threadData?.adminIDs || []).map(id => String(id));
		const botID = String(api.getCurrentUserID());

		if (!adminIDs.includes(botID))
			return message.reply(getLang("needAdmin"));

		const mentionIDs = Object.keys(event.mentions || {});
		const targetIDs = mentionIDs.length > 0
			? mentionIDs
			: event.messageReply?.senderID
				? [event.messageReply.senderID]
				: [];

		if (!targetIDs.length)
			return message.reply(getLang("noTarget"));

		const uniqueTargetIDs = [...new Set(targetIDs.map(id => String(id)))]
			.filter(id => id !== botID);
		const protectedTargets = uniqueTargetIDs.filter(id => adminIDs.includes(id));
		const removableTargets = uniqueTargetIDs.filter(id => !adminIDs.includes(id));

		for (const uid of protectedTargets)
			await message.reply(getLang("cannotKickAdmin", uid));

		if (!removableTargets.length)
			return;

		const results = await Promise.allSettled(
			removableTargets.map(uid => api.removeUserFromGroup(uid, event.threadID))
		);
		const failed = results.filter(result => result.status === "rejected").length;
		const removed = removableTargets.length - failed;

		if (removed)
			await message.reply(getLang("success", removed));
		if (failed)
			await message.reply(getLang("failed", failed));
		}
};