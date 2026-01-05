import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const {
  BOT_TOKEN,
  API_URL,
  GUILD_ID,
  CHANNEL_ONLINE,
  CHANNEL_PEAK
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastOnline = -1;
let lastPeak = -1;

client.once("ready", () => {
  console.log("Bot conectado");

  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      const online = Number(data.online);
      const peak = Number(data.peak);

      const guild = await client.guilds.fetch(GUILD_ID);

      if (online !== lastOnline) {
        const ch = await guild.channels.fetch(CHANNEL_ONLINE);
        await ch.setName(`Ilha Online: ${online}`);
        lastOnline = online;
      }

      if (peak !== lastPeak) {
        const ch = await guild.channels.fetch(CHANNEL_PEAK);
        await ch.setName(`Pico Hoje: ${peak}`);
        lastPeak = peak;
      }

    } catch (err) {
      console.error(err.message);
    }
  }, 30000);
});

client.login(BOT_TOKEN);
