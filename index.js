import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==================================================
// CONFIGURAÇÃO (Railway Variables)
// ==================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const SL_URL = process.env.SL_URL; // URL gerada pelo llRequestURL() no SL

// CHAT ID AUTORIZADO (GRUPO)
const ADMIN_CHAT_ID = --1003540960692;

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
// TELEGRAM → BACKEND → SL
// ==================================================
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg) return res.send("ok");

  const chatId = msg.chat.id;
  const text = (msg.text || "").toLowerCase();

  // 🔒 Segurança: apenas o grupo autorizado
  if (chatId !== ADMIN_CHAT_ID) {
    console.log("Mensagem ignorada de chat não autorizado:", chatId);
    return res.send("ok");
  }

  console.log("Telegram recebido:", text);

  try {
    await fetch(SL_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text
      })
    });
  } catch (err) {
    console.error("Erro enviando comando para SL:", err.message);
  }

  res.send("ok");
});

// ==================================================
// SL → BACKEND → TELEGRAM
// ==================================================
app.post("/sl", async (req, res) => {
  const { online, chat_id, sl_message } = req.body;

  // Atualização de ONLINE
  if (typeof online === "number") {
    currentOnline = online;

    peakDay   = Math.max(peakDay, online);
    peakWeek  = Math.max(peakWeek, online);
    peakMonth = Math.max(peakMonth, online);
    peakYear  = Math.max(peakYear, online);

    console.log("ONLINE atualizado:", online);
  }

  // Mensagem do SL → Telegram
  if (chat_id === ADMIN_CHAT_ID && sl_message) {
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
      console.error("Erro enviando mensagem ao Telegram:", err.message);
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
  console.log("Backend Railway rodando na porta", PORT);
});
