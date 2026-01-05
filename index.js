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
const MIN_INTERVAL = 60_000;

async function updateChannel(guild, channelId, name) {
  if (!channelId) return;
  if (cache[channelId] === name) return;

  const channel = await guild.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  await channel.setName(name);
  cache[channelId] = name;

  console.log("Renomeado:", name);
}

client.once("ready", () => {
  console.log("Bot online");

  setInterval(async () => {
    try {
      if (Date.now() - lastUpdate < MIN_INTERVAL) return;

      const res = await fetch(API_URL, { cache: "no-store" });
      const data = await res.json();

      const guild = await client.guilds.fetch(GUILD_ID);

      await updateChannel(guild, CHANNEL_ONLINE, `🌴 Ilha Online: ${data.online}`);
      await updateChannel(guild, CHANNEL_PEAK_DAY, `🔥 Pico Hoje: ${data.peak_day}`);
      await updateChannel(guild, CHANNEL_PEAK_WEEK, `📅 Pico Semana: ${data.peak_week}`);
      await updateChannel(guild, CHANNEL_PEAK_MONTH, `🗓 Pico Mês: ${data.peak_month}`);
      await updateChannel(guild, CHANNEL_PEAK_YEAR, `🏆 Pico Ano: ${data.peak_year}`);

      lastUpdate = Date.now();

    } catch (err) {
      console.error("Erro:", err.message);
    }
  }, 30_000);
});

client.login(BOT_TOKEN);
