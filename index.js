import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

/* =========================
   VARIÁVEIS DE AMBIENTE
========================= */
const REQUIRED_ENV = [
  "BOT_TOKEN",
  "API_URL",
  "GUILD_ID",
  "CHANNEL_ONLINE",
  "CHANNEL_PEAK"
];

for (const key of REQUIRED_ENV) {
  if (!process.env[key]) {
    console.error("Missing environment variable:", key);
    process.exit(1);
  }
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ONLINE = process.env.CHANNEL_ONLINE;
const CHANNEL_PEAK = process.env.CHANNEL_PEAK;

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   ESTADO INTERNO
========================= */
let lastOnline = -1;
let lastPeak = -1;

/* =========================
   BOT READY
========================= */
client.once("ready", async () => {
  console.log("Bot conectado como:", client.user.tag);

  // 🔴 RESET FORÇADO (IMPORTANTE)
  lastOnline = -1;
  lastPeak = -1;

  setInterval(async () => {
    try {
      const response = await fetch(API_URL, { cache: "no-store" });
      const data = await response.json();

      const online = Number(data.online);
      const peak = Number(data.peak);

      if (isNaN(online) || isNaN(peak)) {
        console.error("Dados inválidos da API:", data);
        return;
      }

      const guild = await client.guilds.fetch(GUILD_ID);

      // 🔹 ATUALIZA CANAL ONLINE
      if (online !== lastOnline) {
        const onlineChannel = await guild.channels.fetch(CHANNEL_ONLINE);
        await onlineChannel.setName(`🌴 Ilha Online: ${online}`);
        lastOnline = online;
        console.log("Canal ONLINE atualizado:", online);
      }

      // 🔹 ATUALIZA CANAL PEAK
      if (peak !== lastPeak) {
        const peakChannel = await guild.channels.fetch(CHANNEL_PEAK);
        await peakChannel.setName(`🔥 Pico Hoje: ${peak}`);
        lastPeak = peak;
        console.log("Canal PEAK atualizado:", peak);
      }

    } catch (err) {
      console.error("Erro no loop:", err.message);
    }
  }, 30000); // ⏱️ 30 segundos
});

/* =========================
   LOGIN
========================= */
client.login(BOT_TOKEN);
