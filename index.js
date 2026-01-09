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

// Anti-spam
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
  if (lastEvent.has(key) && now - lastEvent.get(key) < DEBOUNCE_TIME) return true;
  lastEvent.set(key, now);
  return false;
}

// ================= CARD (BANNER + TEXTO) =================
async function generateCard({
  event,
  username,
  region,
  parcel,
  time,
  avatarUrl
}) {
  const width = 720;
  const bannerHeight = 360;
  const infoHeight = 200;
  const height = bannerHeight + infoHeight;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // ---------- BANNER ----------
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, bannerHeight);

  try {
    const avatar = await loadImage(avatarUrl);

    const scale = Math.max(
      width / avatar.width,
      bannerHeight / avatar.height
    );

    const sw = avatar.width * scale;
    const sh = avatar.height * scale;
    const sx = (width - sw) / 2;
    const sy = (bannerHeight - sh) / 2;

    ctx.drawImage(avatar, sx, sy, sw, sh);
  } catch {
    console.warn("⚠️ Avatar não carregado");
  }

  // ---------- FUNDO INFO ----------
  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, bannerHeight, width, infoHeight);

  let y = bannerHeight + 42;

  // Status
  ctx.fillStyle = event === "ENTROU" ? "#2ecc71" : "#e74c3c";
  ctx.font = "bold 26px Sans-serif";
  ctx.fillText(
    `${event === "ENTROU" ? "🟢" : "🔴"} ${event}`,
    24,
    y
  );

  y += 40;

  // Username
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px Sans-serif";
  ctx.fillText(`👤 ${username}`, 24, y);

  y += 32;

  // Região
  ctx.fillStyle = "#cccccc";
  ctx.fillText(`📍 Região: ${region}`, 24, y);

  y += 28;

  // Parcel
  ctx.fillText(`🏡 Parcel: ${parcel}`, 24, y);

  y += 28;

  // Hora
  ctx.fillStyle = "#aaaaaa";
  ctx.font = "18px Sans-serif";
  ctx.fillText(`🕒 ${time}`, 24, y);

  return canvas.toBuffer("image/png");
}

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
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

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append(
      "photo",
      new Blob([imageBuffer], { type: "image/png" }),
      "evento.png"
    );

    if (slurl) {
      form.append(
        "reply_markup",
        JSON.stringify({
          inline_keyboard: [
            [{ text: "📍 Abrir no mapa", url: slurl }]
          ]
        })
