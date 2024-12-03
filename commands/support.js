const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: "support",
  permissions: "0x0000000000000800",
  options: [],
  run: async (client, interaction) => {
    try {
      const githubLink = "https://github.com/Stocist";

      const embed = new EmbedBuilder()
        .setColor('#00ff00')
        .setTitle('Support')
        .setDescription(`For support, visit our GitHub repository: [GitHub Link](${githubLink})`)
        .setFooter({ text: 'Thank you for using Radio Raccoon!' });

      return interaction.reply({ embeds: [embed] });
    } catch (e) {
      console.error(e); 
      return interaction.reply({ content: "❌ An error occurred while processing your request.", ephemeral: true });
    }
  },
};
