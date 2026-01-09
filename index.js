import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ================= TELEGRAM =================
async function sendTelegram(payload) {
  const r = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    }
  );

  console.log("Telegram:", await r.text());
}

// ================= ENDPOINT SL =================
app.post("/sl", async (req, res) => {
  console.log("Recebido do SL:", req.body);

  const {
    event,
    username,
    uuid,
    region,
    parcel
  } = req.body;

  if (!event || !username) {
    return res.json({ ok: false });
  }

  const avatarPhoto =
    `https://my-secondlife-agni.akamaized.net/users/${username}/sl_image.png`;

  const text =
    (event === "ENTROU" ? "🟢 ENTROU\n" : "🔴 SAIU\n") +
    `👤 ${username}\n` +
    `📍 Região: ${region}\n` +
    `🏡 Parcel: ${parcel}`;

  await sendTelegram({
    chat_id: TELEGRAM_CHAT_ID,
    text,
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: "👤 Perfil",
            url: `https://my.secondlife.com/${username}`
          }
        ]
      ]
    }
  });

  // Envia a foto SEMPRE
  await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        photo: avatarPhoto
      })
    }
  );

  res.json({ ok: true });
});

// ================= STATUS =================
app.get("/", (req, res) => {
  res.send("Backend SL → Telegram ONLINE");
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend rodando");
});
