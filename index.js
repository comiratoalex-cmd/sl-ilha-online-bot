import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ======================================
// CONFIGURAÇÃO FIXA (SEM VARIÁVEL)
// ======================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// ⛔ COLOQUE SEU CHAT ID AQUI
const TELEGRAM_CHAT_ID = -1003540960692;

// ======================================
// FUNÇÕES TELEGRAM
// ======================================
async function sendText(text) {
  const r = await fetch(
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

  console.log("sendMessage:", await r.text());
}

async function sendPhoto(username) {
  const photoUrl =
    `https://my-secondlife-agni.akamaized.net/users/${username}/sl_image.png`;

  const r = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: photoUrl
      })
    }
  );

  console.log("sendPhoto:", await r.text());
}

// ======================================
// ENDPOINT DO SL
// ======================================
app.post("/sl", async (req, res) => {
  console.log("📥 SL:", req.body);

  const { event, username, region, parcel } = req.body;

  if (!event || !username) {
    return res.json({ ok: false, error: "payload inválido" });
  }

  const text =
    (event === "ENTROU" ? "🟢 ENTROU\n" : "🔴 SAIU\n") +
    `👤 ${username}\n` +
    `📍 Região: ${region}\n` +
    `🏡 Parcel: ${parcel}`;

  await sendText(text);
  await sendPhoto(username);

  res.json({ ok: true });
});

// ======================================
// STATUS
// ======================================
app.get("/", (req, res) => {
  res.send("Backend SL → Telegram ONLINE");
});

// ======================================
// START
// ======================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend rodando");
});
