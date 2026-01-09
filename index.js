import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================================
// CONFIGURAÇÃO
// ================================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;

// 🔴 CHAT ID FIXO DO SUPERGRUPO
const TELEGRAM_CHAT_ID = -1003540960692;

// ================================
// HEALTH CHECK
// ================================
app.get("/", (req, res) => {
  res.send("ILHA SALINAS backend ONLINE");
});

// ================================
// SL → TELEGRAM (ÚNICO FLUXO)
// ================================
app.post("/sl", async (req, res) => {
  const { sl_message } = req.body;

  console.log("📥 SL RECEBEU:", req.body);

  if (!sl_message) {
    console.log("⚠️ Nenhuma mensagem recebida do SL");
    return res.json({ ok: false });
  }

  try {
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: sl_message
        })
      }
    );

    const tgBody = await tgRes.text();
    console.log("📤 RESPOSTA TELEGRAM:", tgBody);

  } catch (err) {
    console.error("❌ ERRO AO ENVIAR PARA TELEGRAM:", err.message);
  }

  res.json({ ok: true });
});

// ================================
// START SERVER
// ================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("🚀 Backend Railway rodando na porta", PORT);
});
