import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import fetch from "node-fetch";

const {
  BOT_TOKEN,
  API_URL,
  GUILD_ID,
  CHANNEL_ID
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastName = "";
let lastUpdate = 0;
const MIN_INTERVAL = 60_000; // 1 minuto

client.once("ready", async () => {
  console.log("Bot conectado:", client.user.tag);

  setInterval(async () => {
    try {
      const now = Date.now();
      if (now - lastUpdate < MIN_INTERVAL) return;

      const res = await fetch(API_URL, { cache: "no-store" });
      const data = await res.json();

      const online = Number(data.online);
      if (isNaN(online)) return;

      const newName = `🌴 Ilha Online: ${online}`;
      if (newName === lastName) return;

      const guild = await client.guilds.fetch(GUILD_ID);
      const channel = await guild.channels.fetch(CHANNEL_ID);

      if (!channel || channel.type !== ChannelType.GuildVoice) {
        console.log("Canal nao eh de voz ou nao encontrado");
        return;
      }

      await channel.setName(newName);

      lastName = newName;
      lastUpdate = now;

      console.log("Canal atualizado:", newName);

    } catch (err) {
      console.error("Erro Discord:", err.message);
    }
  }, 30_000);
});

client.login(BOT_TOKEN);
