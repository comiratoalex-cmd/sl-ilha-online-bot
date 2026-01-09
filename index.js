import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

// Anti-spam (ms)
const DEBOUNCE_TIME = 15000;
const lastEvent = new Map();

// ================= UTIL =================
function nowFormatted() {
  const d = new Date();
  return d.toLocaleString("pt-BR", {
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

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, region, parcel, slurl } = req.body;

    if (isSpam(username, event)) {
      return res.json({ ok: true, skipped: "debounce" });
    }

    const isEntrada = event === "ENTROU";
    const chatId = isEntrada ? CHAT_ENTRADA : CHAT_SAIDA;

    const text =
      `${isEntrada ? "🟢" : "🔴"} ${event}\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}\n` +
      `🕒 ${nowFormatted()}`;

    const payload = {
      chat_id: chatId,
      text: text,
      disable_web_page_preview: true, // 🔥 MATA A IMAGEM GRANDE
      reply_markup: slurl
        ? {
            inline_keyboard: [
              [{ text: "📍 Abrir no mapa", url: slurl }]
            ]
          }
        : undefined
    };

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro SL → Telegram:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () =>
  console.log("ILHA SALINAS — Telegram ONLINE (SEM IMAGEM)")
);
