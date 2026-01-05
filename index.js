import { Client, GatewayIntentBits } from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", async () => {
  console.log("BOT ONLINE");

  const guild = await client.guilds.fetch("773483792744316988");
  const channel = await guild.channels.fetch("1457676179044827169");

  console.log("Canal:", channel.name, channel.type);

  await channel.setName("FUNCIONOU FINALMENTE");

  console.log("RENOMEADO");
});

client.login("SEU_BOT_TOKEN");
