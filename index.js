// =====================================================
// ILHA SALINAS — TELEGRAM (TEXTO + LINK AVATAR)
// =====================================================

import express from "express";

const app = express();
app.use(express.json({ limit: "1mb" }));

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

if (!TOKEN || !CHAT_ENTRADA || !CHAT_SAIDA) {
  console.error("❌ Variáveis de ambiente ausentes");
  process.exit(1);
}

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    console.log("📥 SL:", req.body);

    const { event, username, uuid, region, parcel, slurl } = req.body;

    if (!event || !username || !uuid || !region || !parcel) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    const chatId = event === "ENTROU"
      ? CHAT_ENTRADA
      : CHAT_SAIDA;

    const avatarURL = `https://secondlife.com/my/avatar/${uuid}`;

    const payload = {
      chat_id: chatId,
      text:
        `${event === "ENTROU" ? "🟢" : "🔴"} *${event}*\n` +
        `👤 ${username}\n` +
        `📍 Região: ${region}\n` +
        `🏡 Parcel: ${parcel}\n\n` +
        `🔗 [Ver avatar](${avatarURL})`,
      parse_mode: "Markdown",
      disable_web_page_preview: true,
      reply_markup: slurl
        ? {
            inline_keyboard: [
              [
                { text: "🔗 Ver avatar", url: avatarURL },
                { text: "📍 Abrir no mapa", url: slurl }
              ]
            ]
          }
        : undefined
    };

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const tgJson = await tgRes.json();
    console.log("📨 Telegram:", tgJson);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — Telegram TEXTO + LINK");
});
