import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===================================================
// CONFIGURAÇÃO
// ===================================================

// TOKEN DO BOT (Railway Variables)
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// CHAT ID FIXO DO SUPERGRUPO (CORRETO)
const TELEGRAM_CHAT_ID = -1003540960692;

// ===================================================
// FUNÇÃO AUXILIAR - ENVIAR TEXTO
// ===================================================
async function sendTextToTelegram(text) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text
      })
    }
  );

  const body = await res.text();
  console.log("📤 Telegram sendMessage:", body);
}

// ===================================================
// FUNÇÃO AUXILIAR - ENVIAR FOTO + LEGENDA
// ===================================================
async function sendPhotoToTelegram(photoUrl, caption) {
  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: photoUrl,
        caption
      })
    }
  );

  const body = await res.text();
  console.log("📸 Telegram sendPhoto:", body);
}

// ===================================================
// ENDPOINT PRINCIPAL — SL → TELEGRAM
// ===================================================
app.post("/sl", async (req, res) => {
  console.log("📥 RECEBIDO DO SL:", req.body);

  const {
    sl_message, // texto simples (ping, mensagens)
    event,      // ENTROU / SAIU
    name,       // nome do avatar
    uuid,       // UUID do avatar
    region      // nome da região
  } = req.body;

  try {
    // -------------------------------
    // CASO 1 — EVENTO COM FOTO
    // -------------------------------
    if (event && uuid) {
      const photoUrl = `https://secondlife.com/app/image/${uuid}/1`;

      const caption =
        (event === "ENTROU" ? "🟢 ENTROU no parcel\n" : "🔴 SAIU do parcel\n") +
        `👤 ${name}\n📍 ${region}`;

      await sendPhotoToTelegram(photoUrl, caption);
    }

    // -------------------------------
    // CASO 2 — MENSAGEM SIMPLES
    // -------------------------------
    else if (sl_message) {
      await sendTextToTelegram(sl_message);
    }

    else {
      console.log("⚠️ Payload ignorado (sem dados úteis)");
    }

  } catch (err) {
    console.error("❌ ERRO AO ENVIAR PARA TELEGRAM:", err.message);
  }

  res.json({ ok: true });
});

// ===================================================
// HEALTH CHECK
// ===================================================
app.get("/", (req, res) => {
  res.send("ILHA SALINAS backend ONLINE 🚀");
});

// ===================================================
// START SERVER
// ===================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend Railway rodando na porta", PORT);
});
