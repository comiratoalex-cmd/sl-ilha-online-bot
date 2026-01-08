import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==================================================
// CONFIG (Railway ENV)
// ==================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SL_URL = process.env.SL_URL; // URL gerada pelo llRequestURL()

const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;

// ==================================================
// ESTADO GLOBAL (ONLINE + PICOS)
// ==================================================
let currentOnline = 0;

let peakDay = 0;
let peakWeek = 0;
let peakMonth = 0;
let peakYear = 0;

// ==================================================
// TELEGRAM -> SL (WEBHOOK)
// ==================================================
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.send("ok");

  const chatId = msg.chat.id;
  const text = msg.text.toLowerCase();

  console.log("Telegram:", text);

  // Encaminha comando para o SL
  try {
    await fetch(SL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text
      })
    });
  } catch (err) {
    console.error("Erro enviando para SL:", err.message);
  }

  res.send("ok");
});

// ==================================================
// SL -> BACKEND (EVENTOS / RESPOSTAS)
// ==================================================
app.post("/sl", async (req, res) => {
  const { online, chat_id, sl_message } = req.body;

  // Atualizacao de ONLINE
  if (typeof online === "number") {
    currentOnline = online;

    peakDay   = Math.max(peakDay, online);
    peakWeek  = Math.max(peakWeek, online);
    peakMonth = Math.max(peakMonth, online);
    peakYear  = Math.max(peakYear, online);

    console.log("SL ONLINE:", online);
  }

  // Mensagem do SL -> Telegram
  if (chat_id && sl_message) {
    try {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id,
          text: sl_message
        })
      });
    } catch (err) {
      console.error("Erro enviando para Telegram:", err.message);
    }
  }

  res.json({ ok: true });
});

// ==================================================
// API PARA DISCORD BOT
// ==================================================
app.get("/api/status", (req, res) => {
  res.json({
    online: currentOnline,
    peak_day: peakDay,
    peak_week: peakWeek,
    peak_month: peakMonth,
    peak_year: peakYear
  });
});

// ==================================================
// HEALTH CHECK
// ==================================================
app.get("/", (req, res) => {
  res.send("SL Ilha Online Bot - Railway backend running");
});

// ==================================================
// START
// ==================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Backend running on port", PORT);
});
