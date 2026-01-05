import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", async () => {
  console.log("BOT ONLINE");

  const guild = await client.guilds.fetch("SEU_GUILD_ID");
  const channel = await guild.channels.fetch("ID_DO_CANAL_TESTE");

  console.log("Canal:", channel.name, channel.type);

  await channel.setName("FUNCIONOU FINALMENTE");

  console.log("RENOMEADO");
});

client.login("SEU_BOT_TOKEN");
