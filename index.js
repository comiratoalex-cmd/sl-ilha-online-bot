import express from "express";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

if (!TOKEN || !CHAT_ENTRADA || !CHAT_SAIDA) {
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

// ================= CARD (BANNER + TEXTO) =================
async function generateCard({ event, username, region, parcel, time, avatarUrl }) {
  const width = 720;
  const bannerHeight = 360;
  const infoHeight = 200;
  const height = bannerHeight + infoHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Banner
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, bannerHeight);

  try {
    const avatar = await loadImage(avatarUrl);
    const scale = Math.max(width / avatar.width, bannerHeight / avatar.height);
    const sw = avatar.width * scale;
    const sh = avatar.height * scale;
    const sx = (width - sw) / 2;
    const sy = (bannerHeight - sh) / 2;
    ctx.drawImage(avatar, sx, sy, sw, sh);
  } catch {
    console.warn("⚠️ Avatar não carregado");
  }

  // Fundo info
  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, bannerHeight, width, infoHeight);

  let y = bannerHeight + 42;

  // Status
  ctx.fillStyle = event === "ENTROU" ? "#2ecc71" : "#e74c3c";
  ctx.font = "bold 26px Sans-serif";
  ctx.fillText(`${event === "ENTROU" ? "🟢" : "🔴"} ${event}`, 24, y);

  y += 40;

  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Sans-serif";
  ctx.fillText(`👤 ${username}`, 24, y);

  y += 32;
  ctx.fillStyle = "#cccccc";
  ctx.fillText(`📍 Região: ${region}`, 24, y);

  y += 28;
  ctx.fillText(`🏡 Parcel: ${parcel}`, 24, y);

  y += 28;
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "18px Sans-serif";
  ctx.fillText(`🕒 ${time}`, 24, y);

  return canvas.toBuffer("image/png");
}

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    console.log("REQ:", req.body);

    const { event, username, region, parcel, avatar, slurl } = req.body;

    if (!event || !username || !region || !parcel || !avatar) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    if (isSpam(username, event)) {
      return res.json({ ok: true, skipped: "debounce" });
    }

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;

    const imageBuffer = await generateCard({
      event,
      username,
      region,
      parcel,
      time: nowFormatted(),
      avatarUrl: avatar
    });

    const base64Image = imageBuffer.toString("base64");

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: `data:image/png;base64,${base64Image}`,
          caption:
            `${event}\n` +
            `👤 ${username}\n` +
            `📍 ${region}\n` +
            `🏡 ${parcel}\n` +
            `🕒 ${nowFormatted()}`,
          reply_markup: slurl
            ? {
                inline_keyboard: [
                  [{ text: "📍 Abrir no mapa", url: slurl }]
                ]
              }
            : undefined
        })
      }
    );

    const tgJson = await tgRes.json();
    console.log("TELEGRAM:", tgJson);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — Telegram ONLINE (BANNER MODE)");
});
