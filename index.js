import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHAT_ID   = process.env.CHAT_ID;

// ================= ENDPOINT SL =================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, photo, region, parcel } = req.body;

    if (!event || !username || !photo) {
      return res.status(400).send("Dados incompletos");
    }

    const caption =
      `${event === "ENTROU" ? "🟢" : "🔴"} *${event}*\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}`;

    await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        photo: photo,
        caption: caption,
        parse_mode: "Markdown"
      })
    });

    console.log(`[${event}] ${username}`);
    res.send("OK");

  } catch (err) {
    console.error("Erro Telegram:", err.message);
    res.status(500).send("Erro");
  }
});

// ================= START =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 SL → Telegram ativo");
});
