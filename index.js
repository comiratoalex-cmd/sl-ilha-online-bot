import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const TOKEN = process.env.BOT_TOKEN;
const API_URL = process.env.API_URL;
const GUILD_ID = process.env.GUILD_ID;
const CHANNEL_ONLINE = process.env.CHANNEL_ONLINE;
const CHANNEL_PEAK = process.env.CHANNEL_PEAK;

let lastOnline = null;
let lastPeak = null;

client.once("ready", () => {
  console.log(Bot conectado como );

  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      const guild = await client.guilds.fetch(GUILD_ID);

      if (data.online !== lastOnline) {
        const chOnline = await guild.channels.fetch(CHANNEL_ONLINE);
        await chOnline.setName(🌴 Ilha Online: );
        lastOnline = data.online;
      }

      if (data.peak !== lastPeak) {
        const chPeak = await guild.channels.fetch(CHANNEL_PEAK);
        await chPeak.setName(🔥 Pico Hoje: );
        lastPeak = data.peak;
      }

    } catch (err) {
      console.error("Erro:", err.message);
    }
  }, 300000); // 5 minutos
});

client.login(TOKEN);
