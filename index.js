import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ===================================================
// CONFIGURAÇÃO
// ===================================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = -1003540960692;

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

// Enviar TEXTO simples
async function sendText(text) {
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

  console.log("📤 sendMessage:", await res.text());
}

// Enviar FOTO + LEGENDA (com fallback)
async function sendPhoto(uuid, caption) {
  let photoUrl = `https://my-secondlife.s3.amazonaws.com/users/${uuid}/profile.jpg`;

  try {
    // testa se a imagem existe
    const head = await fetch(photoUrl, { method: "HEAD" });
    if (!head.ok) {
      photoUrl = "https://secondlife.com/static/img/avatar.png";
    }

    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: photoUrl,
          caption,
          parse_mode: "Markdown"
        })
      }
    );

    console.log("📸 sendPhoto:", await res.text());
  } catch (err) {
    console.error("❌ Erro sendPhoto:", err.message);
  }
}

// ===================================================
// ENDPOINT SL → TELEGRAM
// ===================================================
app.post("/sl", async (req, res) => {
  console.log("📥 RECEBIDO DO SL:", req.body);

  const {
    sl_message, // ping / mensagem manual
    event,      // ENTROU / SAIU
    name,
    uuid,
    region,
    parcel,
    slurl
  } = req.body;

  try {
    // ---------------------------------
    // 1) EVENTO COM FOTO
    // ---------------------------------
    if (event && uuid) {
      const caption =
        (event == "ENTROU" ? "🟢 *ENTROU* no parcel\n" : "🔴 *SAIU* do parcel\n") +
        `👤 *${name}*\n` +
        `📍 Região: ${region}\n` +
        `🏡 Parcel: ${parcel}\n` +
        (slurl ? `🌍 [Teleportar](${slurl})` : "");

      await sendPhoto(uuid, caption);
    }

    // ---------------------------------
    // 2) MENSAGEM SIMPLES
    // ---------------------------------
    else if (sl_message) {
      await sendText(sl_message);
    }

  } catch (err) {
    console.error("❌ ERRO GERAL:", err.message);
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
// START
// ===================================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend Railway rodando na porta", PORT);
});
