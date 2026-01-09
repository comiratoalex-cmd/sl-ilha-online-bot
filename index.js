import express from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import { createCanvas } from "canvas";

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

  if (lastEvent.has(key) && now - lastEvent.get(key) < DEBOUNCE_TIME) {
    return true;
  }

  lastEvent.set(key, now);
  return false;
}

// ================= CARD IMAGE =================
function generateCard({ event, username, region, parcel, time }) {
  const width = 600;
  const height = 260;

  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext("2d");

  // Fundo
  ctx.fillStyle = "#0f1115";
  ctx.fillRect(0, 0, width, height);

  // Barra lateral
  ctx.fillStyle = event === "ENTROU" ? "#2ecc71" : "#e74c3c";
  ctx.fillRect(0, 0, 8, height);

  // Título
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 28px Sans-serif";
  ctx.fillText(
    event === "ENTROU" ? "🟢 ENTROU" : "🔴 SAIU",
    24,
    46
  );

  // Conteúdo
  ctx.font = "20px Sans-serif";
  ctx.fillText(`👤 ${username}`, 24, 96);
  ctx.fillText(`📍 Região: ${region}`, 24, 132);
  ctx.fillText(`🏡 Parcel: ${parcel}`, 24, 168);
  ctx.fillText(`🕒 ${time}`, 24, 204);

  return canvas.toBuffer("image/png");
}

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, region, parcel, slurl } = req.body;

    if (!event || !username || !region || !parcel) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    if (isSpam(username, event)) {
      return res.json({ ok: true, skipped: "debounce" });
    }

    const isEntrada = event === "ENTROU";
    const chatId = isEntrada ? CHAT_ENTRADA : CHAT_SAIDA;

    const imageBuffer = generateCard({
      event,
      username,
      region,
      parcel,
      time: nowFormatted()
    });

    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("photo", imageBuffer, { filename: "evento.png" });

    // Botão inline (opcional)
    if (slurl && slurl !== "") {
      form.append(
        "reply_markup",
        JSON.stringify({
          inline_keyboard: [
            [{ text: "📍 Abrir no mapa", url: slurl }]
          ]
        })
      );
    }

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
      method: "POST",
      body: form
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro SL → Telegram:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — Telegram ONLINE (CARD MODE)");
});
