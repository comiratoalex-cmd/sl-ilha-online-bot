import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ID = process.env.CHANNEL_ID; // CANAL DE VOZ

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastName = "";
let lastUpdate = 0;
const MIN_INTERVAL = 60_000; // 1 minuto (rate-limit safe)

client.once("ready", () => {
  console.log("Bot conectado");

  setInterval(async () => {
    try {
      const now = Date.now();
      if (now - lastUpdate < MIN_INTERVAL) return;

      const res = await fetch(API_URL);
      const { online } = await res.json();

      const newName = `🌴 Ilha Online: ${online}`;

      if (newName === lastName) return;

      const guild = await client.guilds.fetch(GUILD_ID);
      const channel = await guild.channels.fetch(CHANNEL_ID);

      if (!channel || channel.type !== 2) {
        console.log("Canal nao eh de voz");
        return;
      }

      await channel.setName(newName);

      lastName = newName;
      lastUpdate = now;

      console.log("Canal renomeado:", newName);

    } catch (err) {
      console.error("Erro ao renomear:", err.message);
    }
  }, 30_000);
});

client.login(BOT_TOKEN);
