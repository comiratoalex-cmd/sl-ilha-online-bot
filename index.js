import { Client, GatewayIntentBits, ChannelType } from "discord.js";
import fetch from "node-fetch";

const {
  BOT_TOKEN,
  API_URL,
  GUILD_ID,
  CHANNEL_ONLINE,
  CHANNEL_PEAK_DAY,
  CHANNEL_PEAK_WEEK,
  CHANNEL_PEAK_MONTH,
  CHANNEL_PEAK_YEAR
} = process.env;

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let cache = {};
let lastUpdate = 0;
const MIN_INTERVAL = 60000;

async function updateChannel(guild, id, name) {
  if (!id || cache[id] === name) return;

  const ch = await guild.channels.fetch(id);
  if (!ch || ch.type !== ChannelType.GuildVoice) return;

  await ch.setName(name);
  cache[id] = name;
}

client.once("ready", () => {
  console.log("Bot online");

  setInterval(async () => {
    try {
      if (Date.now() - lastUpdate < MIN_INTERVAL) return;

      const res = await fetch(API_URL, { cache: "no-store" });
      const d = await res.json();
      const g = await client.guilds.fetch(GUILD_ID);

      await updateChannel(g, CHANNEL_ONLINE, `🌴 Ilha Online: ${d.online}`);
      await updateChannel(g, CHANNEL_PEAK_DAY, `🔥 Pico Hoje: ${d.peak_day}`);
      await updateChannel(g, CHANNEL_PEAK_WEEK, `📅 Pico Semana: ${d.peak_week}`);
      await updateChannel(g, CHANNEL_PEAK_MONTH, `🗓 Pico Mes: ${d.peak_month}`);
      await updateChannel(g, CHANNEL_PEAK_YEAR, `🏆 Pico Ano: ${d.peak_year}`);

      lastUpdate = Date.now();
    } catch (e) {
      console.error(e.message);
    }
  }, 30000);
});

client.login(BOT_TOKEN);
