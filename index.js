import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post("/sl", async (req, res) => {
  try {
    const { event, username, photo, region, parcel, slurl } = req.body;

    // 1️⃣ FOTO + TEXTO (SEM LINK)
    await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        photo: photo,
        caption:
          `${event === "ENTROU" ? "🟢" : "🔴"} ${event}\n` +
          `👤 ${username}\n` +
          `📍 Região: ${region}\n` +
          `🏡 Parcel: ${parcel}`
      })
    });

    // 2️⃣ LINK EM MENSAGEM SEPARADA
    if (slurl && slurl !== "") {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: `🔗 Localização:\n${slurl}`
        })
      });
    }

    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(process.env.PORT || 3000, () =>
  console.log("SL → Telegram (opção 1) online")
);
