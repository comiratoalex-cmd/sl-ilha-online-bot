import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

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

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    console.log("SL CHEGOU:", req.body);

    const { event, username, region, parcel, avatar, slurl } = req.body;

    if (!event || !username || !region || !parcel || !avatar) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    if (isSpam(username, event)) {
      console.log("⏸️ Evento ignorado (debounce)");
      return res.json({ ok: true, skipped: true });
    }

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;

    const payload = {
      chat_id: chatId,
      photo: avatar, // URL direta do SL
      caption:
        `${event === "ENTROU" ? "🟢" : "🔴"} ${event}\n` +
        `👤 ${username}\n` +
        `📍 Região: ${region}\n` +
        `🏡 Parcel: ${parcel}\n` +
        `🕒 ${nowFormatted()}`,
      reply_markup: slurl
        ? {
            inline_keyboard: [
              [{ text: "📍 Abrir no mapa", url: slurl }]
            ]
          }
        : undefined
    };

    console.log("ENVIANDO PARA TELEGRAM:", payload);

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const tgJson = await tgRes.json();
    console.log("TELEGRAM RESPOSTA:", tgJson);

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
  console.log("✅ ILHA SALINAS — Telegram ONLINE (URL MODE)");
});
