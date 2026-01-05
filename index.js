import { Client, GatewayIntentBits } from "discord.js";
import fetch from "node-fetch";

/* =========================
   VARIÁVEIS OBRIGATÓRIAS
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
    console.error(`❌ Variável de ambiente ausente: ${key}`);
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

/* =========================
   CLIENTE DISCORD
========================= */
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let lastOnline = null;
let lastPeak = null;

/* =========================
   BOT READY
========================= */
client.once("ready", async () => {
  console.log(`✅ Bot conectado como ${client.user.tag}`);

  // Teste imediato de permissão (executa UMA vez)
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    const ch = await guild.channels.fetch(CHANNEL_ONLINE);

    await ch.setName("🟢 Ilha Online: verificando...");
    console.log("✅ Permissão de renomear canal CONFIRMADA");
  } catch (err) {
    console.error("❌ ERRO AO RENOMEAR CANAL:", err.message);
    console.error("➡️ Verifique Manage Channels no canal de VOZ");
    return;
  }

  /* =========================
     LOOP PRINCIPAL
  ========================= */
  setInterval(async () => {
    try {
      const res = await fetch(API_URL);
      const data = await res.json();

      const online = Number(data.online);
      const peak = Number(data.peak);

      if (isNaN(online) || isNaN(peak)) {
        console.error("❌ Dados inválidos da API:", data);
        return;
      }

      const guild = await client.guilds.fetch(GUILD_ID);

      // Atualiza ONLINE
      if (online !== lastOnline) {
        const chOnline = await guild.channels.fetch(CHANNEL_ONLINE);
        await chOnline.setName(`🌴 Ilha Online: ${online}`);
        lastOnline = online;
        console.log(`🔄 Online atualizado: ${online}`);
      }

      // Atualiza PEAK
      if (peak !== lastPeak) {
        const chPeak = await guild.channels.fetch(CHANNEL_PEAK);
        await chPeak.setName(`🔥 Pico Hoje: ${peak}`);
        lastPeak = peak;
        console.log(`🔄 Peak atualizado: ${peak}`);
      }

    } catch (err) {
      console.error("❌ Erro no loop:", err.message);
    }
  }, 30000); // ⏱️ 30 segundos
});

/* ========*
