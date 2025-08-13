"use strict";

module.exports = {
  name: "clear",
  description: "Clear the queue",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const guildId = interaction.guildId;
      client.audio?.queues?.clear(guildId);
      return interaction.reply({ content: "Queue cleared." });
    } catch (e) {
      console.error("clear command error:", e);
      return interaction.reply({ content: "Failed to clear queue.", ephemeral: true });
    }
  }
};


