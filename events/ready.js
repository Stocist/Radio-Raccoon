

const config = require("../config.js");
const { ActivityType  } = require("discord.js")
module.exports = async (client) => {




const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const rest = new REST({ version: "10" }).setToken(config.TOKEN || process.env.TOKEN);
(async () => {
  try {
    const guildId = process.env.GUILD_ID;
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(client.user.id, guildId), {
        body: await client.commands,
      });
      console.log('\x1b[36m%s\x1b[0m', `|    🚀 Guild commands loaded for GUILD_ID=${guildId}!`)

      // Ensure no stale global commands remain (which cause duplicates in the picker)
      await rest.put(Routes.applicationCommands(client.user.id), { body: [] });
      console.log('\x1b[36m%s\x1b[0m', '|    🧹 Cleared GLOBAL commands to avoid duplicates');
    } else {
      await rest.put(Routes.applicationCommands(client.user.id), {
        body: await client.commands,
      });
      console.log('\x1b[36m%s\x1b[0m', '|    🚀 Global commands loaded (may take up to 1 hour to propagate).')
    }
  } catch (err) {
    console.log('\x1b[36m%s\x1b[0m', '|    ❌ Commands Failed To Load!');
  }
})();

console.log('\x1b[32m%s\x1b[0m', `|    🌼 Logged in as ${client.user.username}`);

const serverCount = client.guilds.cache.size;
setInterval(() => client.user.setActivity({ 
  name:`🦝 Radio Raccoon`, 
  type: ActivityType.Listening }), 10000);
client.errorLog = config.errorLog
  
}

