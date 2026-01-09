import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ================= ENDPOINT =================
app.post("/sl", async (req, res) => {
  try {
    const {
      event,      // "ENTROU" | "SAIU"
      username,   // alexcominatto.bechir
      photo,      // https://my-secondlife-agni.akamaized.net/users/...
      region,     // Pelican Cove
      parcel,     // :::PRAIA DE SALINAS:::
      slurl       // http://maps.secondlife.com/...
    } = req.body;

    if (!event || !username || !photo || !region || !parcel) {
      return res.status(400).json({ error: "Dados incompletos" });
    }

    const caption =
      `${event === "ENTROU" ? "🟢" : "🔴"} ${event}\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}`;

    const payload = {
      chat_id: CHAT_ID,
      photo: photo,
      caption: caption
    };

    // BOTÃO INLINE (sem link no texto)
    if (slurl && slurl !== "") {
      payload.reply_markup = {
        inline_keyboard: [
          [
            {
              text: "📍 Abrir no mapa",
              url: slurl
            }
          ]
        ]
      };
    }

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendPhoto`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("Erro Telegram:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("🟢 SL → Telegram (Botão Inline) ONLINE");
});
