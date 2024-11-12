
const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "support",
  description: "Get support server link",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try 
    {
      const githubLink = "https://github.com/Stocist";
      const embed = new EmbedBuilder()
        .setColor("Blue")
        .setDescription(`[${githubLink}](${githubLink})`);
      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error(e);
    }
  },
};
