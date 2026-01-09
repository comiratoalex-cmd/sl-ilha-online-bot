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

// ================= CARD IMAGE =================
async function generateCard({
  event,
  username,
  region,
  parcel,
  time,
  avatarUrl
}) {
  const width = 720;
  const height = 240;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fundo
  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, 0, width, height);

  // Barra lateral
  ctx.fillStyle = event === "ENTROU" ? "#2ecc71" : "#e74c3c";
  ctx.fillRect(0, 0, 10, height);

  // Status
  ctx.beginPath();
  ctx.arc(34, 34, 10, 0, Math.PI * 2);
  ctx.fill();

  // Título
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Sans-serif";
  ctx.fillText(event, 54, 42);

  // Avatar
  try {
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(80, 130, 44, 0, Math.PI * 2);
    ctx.clip();
    ctx.drawImage(avatar, 36, 86, 88, 88);
    ctx.restore();
  } catch {
    console.warn("⚠️ Avatar não carregado");
  }

  // Texto
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 22px Sans-serif";
  ctx.fillText(username, 150, 110);

  ctx.fillStyle = "#cccccc";
  ctx.font = "18px Sans-serif";
  ctx.fillText(`📍 Região: ${region}`, 150, 145);
  ctx.fillText(`🏡 Parcel: ${parcel}`, 150, 175);

  ctx.fillStyle = "#aaaaaa";
  ctx.font = "16px Sans-serif";
  ctx.fillText(`🕒 ${time}`, 150, 205);

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
      return res.json({ ok: true, skipped:
