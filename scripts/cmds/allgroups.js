module.exports = {
  config: {
    name: "allgroups",
    version: "1.0.1",
    role: 2,
    author: "Milon",
    description: "List the bot's groups and leave or ban a selected group",
    category: "admin",
    guide: "{pn}",
    countDown: 5
  },

  onStart: async function ({ api, event, message }) {
    const threadList = await api.getThreadList(50, null, ["INBOX"]);
    const groups = (threadList || []).filter(group => group.isSubscribed && group.isGroup);

    if (!groups.length)
      return message.reply("No groups were found.");

    const groupIDs = [];
    const lines = groups.map((group, index) => {
      groupIDs.push(group.threadID);
      return `${index + 1}. ${group.name || "Unnamed group"}\nID: ${group.threadID}\nMembers: ${(group.participantIDs || []).length}`;
    });

    return message.reply(
      `${lines.join("\n\n")}\n\nReply with "out <number>" or "ban <number>" to take action.`,
      (err, info) => {
        if (err || !info?.messageID) return;
        global.GoatBot.onReply.set(info.messageID, {
          commandName: "allgroups",
          messageID: info.messageID,
          author: event.senderID,
          groupIDs
        });
      }
    );
  },

  onReply: async function ({ api, event, Reply, message, Threads }) {
    if (String(event.senderID) !== String(Reply.author))
      return;

    const [action, number] = String(event.body || "").trim().toLowerCase().split(/\s+/);
    const index = Number.parseInt(number, 10) - 1;
    const targetID = Reply.groupIDs?.[index];

    if (!targetID || !["out", "ban"].includes(action))
      return message.reply('Reply with "out <number>" or "ban <number>".');

    if (action === "out") {
      try {
        await api.removeUserFromGroup(api.getCurrentUserID(), targetID);
        return message.reply(`Successfully left group ${targetID}.`);
      } catch (error) {
        console.error("[allgroups] Leave failed:", error.message);
        return message.reply("Could not leave that group.");
      }
    }

    try {
      await Threads.setData(targetID, { data: { banned: true } });
      return message.reply(`Group ${targetID} was banned successfully.`);
    } catch (error) {
      console.error("[allgroups] Ban failed:", error.message);
      return message.reply("Could not ban that group.");
    }
  }
};