// =====================================================
// ILHA SALINAS — TELEGRAM + RAILWAY (LAYOUT SALINAS)
// =====================================================

import express from "express";
import fetch from "node-fetch";
import fs from "fs";
import { createCanvas, loadImage } from "canvas";

// ================= APP =================
const app = express();
app.use(express.json({ limit: "2mb" }));

// ================= STATIC =================
if (!fs.existsSync("banners")) {
  fs.mkdirSync("banners");
}
app.use("/banners", express.static("banners"));

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;
const BASE_URL = process.env.RAILWAY_STATIC_URL; // ex: https://seuapp.up.railway.app

if (!TOKEN || !CHAT_ENTRADA || !CHAT_SAIDA || !BASE_URL) {
  console.error("❌ Variáveis de ambiente ausentes");
  process.exit(1);
}

// ================= ANTI-SPAM =================
const DEBOUNCE_TIME = 15000;
const lastEvent = new Map();

// ================= UTIL =================
function nowFormatted() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function isSpam(username, event) {
  const key = `${username}:${event}`;
  const now = Date.now();
  if (lastEvent.has(key) && now - lastEvent.get(key) < DEBOUNCE_TIME) {
    return true;
  }
  lastEvent.set(key, now);
  return false;
}

// ================= BANNER SALINAS =================
async function gerarBannerSalinas(data) {
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext("2d");

  // Fundo base
  ctx.fillStyle = "#0b1622";
  ctx.fillRect(0, 0, 800, 450);

  // Overlay por evento
  ctx.fillStyle =
    data.event === "ENTROU"
      ? "rgba(0,180,90,0.25)"
      : "rgba(180,40,40,0.25)";
  ctx.fillRect(0, 0, 800, 450);

  // Avatar (foto oficial do perfil SL)
  const avatarURL = `https://secondlife.com/my/avatar/${data.avatar}`;
  const avatarImg = await loadImage(avatarURL);
  ctx.drawImage(avatarImg, 30, 40, 300, 370);

  // Textos
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Arial";
  ctx.fillText(data.event, 370, 80);

  ctx.font = "bold 26px Arial";
  ctx.fillText(data.username, 370, 130);

  ctx.font = "20px Arial";
  ctx.fillText(`Região: ${data.region}`, 370, 180);
  ctx.fillText(`Parcel: ${data.parcel}`, 370, 220);
  ctx.fillText(nowFormatted(), 370, 270);

  const filename = `banners/${data.avatar}_${Date.now()}.png`;
  fs.writeFileSync(filename, canvas.toBuffer("image/png"));

  return `${BASE_URL}/${filename}`;
}

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    console.log("📥 SL CHEGOU:", req.body);

    const { event, username, region, parcel, avatar, slurl } = req.body;

    // avatar = UUID DO AVATAR
    if (!event || !username || !region || !parcel || !avatar) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    if (isSpam(username, event)) {
      console.log("⏸️ Evento ignorado (debounce)");
      return res.json({ ok: true, skipped: true });
    }

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;

    // 🔹 GERAR BANNER
    const bannerURL = await gerarBannerSalinas({
      event,
      username,
      region,
      parcel,
      avatar
    });

    // 🔹 TELEGRAM PAYLOAD
    const payload = {
      chat_id: chatId,
      photo: bannerURL,
      caption:
        `${event === "ENTROU" ? "🟢" : "🔴"} *${event}*\n` +
        `👤 ${username}\n` +
        `📍 ${region}\n` +
        `🕒 ${nowFormatted()}`,
      parse_mode: "Markdown",
      reply_markup: slurl
        ? {
            inline_keyboard: [
              [{ text: "📍 Abrir no mapa", url: slurl }]
            ]
          }
        : undefined
    };

    console.log("📤 ENVIANDO PARA TELEGRAM:", payload);

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const tgJson = await tgRes.json();
    console.log("📨 TELEGRAM RESPOSTA:", tgJson);

    if (!tgJson.ok) {
      return res.status(500).json(tgJson);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO GERAL:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — Telegram ONLINE (BANNER MODE)");
});
