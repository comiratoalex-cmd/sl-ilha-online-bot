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

// ================================
// CLIENTE
// ================================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// ================================
// CONTROLE
// ================================
let cache = {};                // ultimo nome aplicado por canal
let lastUpdate = 0;            // timestamp da ultima atualizacao
const MIN_INTERVAL = 20000;    // 20 segundos

// ================================
// FUNCAO DE UPDATE
// ================================
async function updateChannel(guild, channelId, newName) {
  if (!channelId) return;
  if (cache[channelId] === newName) return;

  const channel = await guild.channels.fetch(channelId);
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  await channel.setName(newName);
  cache[channelId] = newName;

  console.log("Renomeado:", newName);
}

// ================================
// EVENTO READY
// ================================
client.once("ready", () => {
  console.log("Bot online:", client.user.tag);

  setInterval(async () => {
    try {
      const now = Date.now();
      if (now - lastUpdate < MIN_INTERVAL) return;

      const res = await fetch(API_URL, { cache: "no-store" });
      const data = await res.json();

      const guild = await client.guilds.fetch(GUILD_ID);

      await updateChannel(guild, CHANNEL_ONLINE,     `🌴 Ilha Online: ${data.online}`);
      await updateChannel(guild, CHANNEL_PEAK_DAY,   `🔥 Pico Hoje: ${data.peak_day}`);
      await updateChannel(guild, CHANNEL_PEAK_WEEK,  `📅 Pico Semana: ${data.peak_week}`);
      await updateChannel(guild, CHANNEL_PEAK_MONTH, `🗓 Pico Mês: ${data.peak_month}`);
      await updateChannel(guild, CHANNEL_PEAK_YEAR,  `🏆 Pico Ano: ${data.peak_year}`);

      lastUpdate = now;

    } catch (err) {
      console.error("Erro no bot:", err.message);
    }
  }, 30000); // checa API a cada 30s
});

// ================================
// LOGIN
// ================================
client.login(BOT_TOKEN);
