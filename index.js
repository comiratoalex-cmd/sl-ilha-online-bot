import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

app.post("/sl", async (req, res) => {
  try {
    const { event, username, region, parcel, slurl } = req.body;

    const text =
      `${event === "ENTROU" ? "🟢" : "🔴"} ${event}\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}`;

    const payload = {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: "HTML"
    };

    // BOTÃO INLINE (opcional)
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

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
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

app.listen(process.env.PORT || 3000, () =>
  console.log("SL → Telegram ONLINE (texto limpo, ícone pequeno)")
);
