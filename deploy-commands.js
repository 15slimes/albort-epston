// src/deploy-commands.js
// Run once: `node src/deploy-commands.js`
// Registers slash commands globally (takes ~1 hour to propagate) or
// instantly to a single guild if GUILD_ID is set in .env.

import { REST, Routes } from "discord.js";
import { commands } from "./commands/index.js";
import "dotenv/config";

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

const target = process.env.GUILD_ID
  ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
  : Routes.applicationCommands(process.env.CLIENT_ID);

try {
  console.log(`Registering ${commands.length} slash commands…`);
  const data = await rest.put(target, { body: commands });
  console.log(`✅ Registered ${data.length} commands.`);
} catch (err) {
  console.error(err);
}
