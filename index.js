import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

/* ENV CHECK */
const REQUIRED = [
  "BOT_TOKEN",
  "API_URL",
  "GUILD_ID",
  "CHANNEL_ONLINE",
  "CHANNEL_PEAK"
];

for (const k of REQUIRED) {
  if (!process.env[k]) {
    console.error("Missing ENV:", k);
    process.exit(1);
  }
}

const BOT_TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ONLINE = process.env.CHANNEL_ONLINE;
const CHANNEL_PEAK = process.env.CHANNEL_PEAK;

/* DISCORD CLIENT */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastOnline = null;
let lastPeak = null;

client.once("ready", async () => {
  console.log("Bot connected:", client.user.tag);

  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const channel = await guild.channels.fetch(CHANNEL_ONLINE);
    await channel.setName("ONLINE: starting");
    console.log("Rename permission OK");
  } catch (err) {
    console.error("Rename test failed:", err.message);
    return;
  }

  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      const online = Number(data.online);
      const peak = Number(data.peak);

      if (isNaN(online) || isNaN(peak)) return;

      const guild = await client.guilds.fetch(GUILD_ID);

      if (online !== lastOnline) {
        const ch = await guild.channels.fetch(CHANNEL_ONLINE);
        await ch.setName("ONLINE: " + online);
        lastOnline = online;
      }

      if (peak !== lastPeak) {
        const ch = await guild.channels.fetch(CHANNEL_PEAK);
        await ch.setName("PEAK: " + peak);
        lastPeak = peak;
      }

    } catch (err) {
      console.error("Loop error:", err.message);
    }
  }, 30000);

});

client.login(BOT_TOKEN);
