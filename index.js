import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==================================================
// CONFIGURAÇÃO (VEM DO RAILWAY)
// ==================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ==================================================
// FUNÇÃO TELEGRAM
// ==================================================
async function sendTelegramMessage(text) {
  const response = await fetch(
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

  const data = await response.text();
  console.log("Telegram:", data);
}

// ==================================================
// ENDPOINT RECEBENDO DADOS DO SL
// ==================================================
app.post("/sl", async (req, res) => {
  const { event, name, region, parcel } = req.body;

  console.log("Recebido do SL:", req.body);

  if (event && name) {
    const message =
      (event === "ENTROU" ? "🟢 ENTROU\n" : "🔴 SAIU\n") +
      `👤 ${name}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}`;

    await sendTelegramMessage(message);
  }

  res.json({ ok: true });
});

// ==================================================
// STATUS
// ==================================================
app.get("/", (req, res) => {
  res.send("Backend SL → Telegram ONLINE");
});

// ==================================================
// START
// ==================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend rodando na porta ${PORT}`);
});
