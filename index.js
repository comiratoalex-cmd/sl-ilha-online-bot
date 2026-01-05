import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

/* ===== VERIFICA VARIÁVEIS ===== */
const requiredVars = [
  "BOT_TOKEN",
  "API_URL",
  "GUILD_ID",
  "CHANNEL_ONLINE",
  "CHANNEL_PEAK"
];

for (const v of requiredVars) {
  if (!process.env[v]) {
    console.error(`ENV MISSING: ${v}`);
    process.exit(1);
  }
}

const {
  BOT_TOKEN,
  API_URL,
  GUILD_ID,
  CHANNEL_ONLINE,
  CHANNEL_PEAK
} = process.env;

/* ===== CLIENTE DISCORD ===== */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastOnline = null;
let lastPeak = null;

client.once("ready", () => {
  console.log(`Bot conectado como ${client.user.tag}`);

  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      const guild = await client.guilds.fetch(GUILD_ID);

      if (data.online !== lastOnline) {
        const chOnline = await guild.channels.fetch(CHANNEL_ONLINE);
        await chOnline.setName(`🌴 Ilha Online: ${data.online}`);
        lastOnline = data.online;
      }

      if (data.peak !== lastPeak) {
        const chPeak = await guild.channels.fetch(CHANNEL_PEAK);
        await chPeak.setName(`🔥 Pico Hoje: ${data.peak}`);
        lastPeak = data.peak;
      }

    } catch (err) {
      console.error("Runtime error:", err.message);
    }
  }, 300000); // 5 minutos
});

/* ===== LOGIN ===== */
client.login(BOT_TOKEN);
