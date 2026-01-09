import express from "express";
import { createCanvas, loadImage } from "@napi-rs/canvas";

const app = express();
app.use(express.json({ limit: "10mb" }));

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

console.log("BOOT");
console.log("TOKEN OK?", !!TOKEN);
console.log("CHAT_ENTRADA:", CHAT_ENTRADA);
console.log("CHAT_SAIDA:", CHAT_SAIDA);

if (!TOKEN || !CHAT_ENTRADA || !CHAT_SAIDA) {
  console.error("❌ VARIÁVEIS DE AMBIENTE AUSENTES");
  process.exit(1);
}

// ================= UTIL =================
function nowFormatted() {
  return new Date().toISOString();
}

// ================= CARD (SIMPLES) =================
async function generateCard(avatarUrl) {
  const w = 600;
  const h = 400;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#111";
  ctx.fillRect(0, 0, w, h);

  try {
    console.log("CARREGANDO AVATAR:", avatarUrl);
    const img = await loadImage(avatarUrl);
    ctx.drawImage(img, 0, 0, w, h);
    console.log("AVATAR OK");
  } catch (e) {
    console.error("❌ ERRO AO CARREGAR AVATAR", e.message);
  }

  ctx.fillStyle = "#fff";
  ctx.font = "20px sans-serif";
  ctx.fillText("DEBUG IMAGE", 20, 30);

  return canvas.toBuffer("image/png");
}

// ================= ROUTA PRINCIPAL =================
app.post("/sl", async (req, res) => {
  console.log("====================================");
  console.log("🚀 POST /sl RECEBIDO");
  console.log("BODY:", JSON.stringify(req.body, null, 2));

  const { event, username, region, parcel, avatar, slurl } = req.body;

  console.log("EVENT:", event);
  console.log("USERNAME:", username);
  console.log("REGION:", region);
  console.log("PARCEL:", parcel);
  console.log("AVATAR:", avatar);
  console.log("SLURL:", slurl);

  const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;
  console.log("CHAT ESCOLHIDO:", chatId);

  // ================= TESTE 1 — TEXTO =================
  try {
    console.log("📨 TESTE 1 — sendMessage");
    const r1 = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: `DEBUG TEXTO OK\n${nowFormatted()}`
        })
      }
    );
    const j1 = await r1.json();
    console.log("TELEGRAM sendMessage:", j1);
  } catch (e) {
    console.error("❌ ERRO sendMessage", e);
  }

  // ================= TESTE 2 — IMAGEM =================
  try {
    console.log("🖼️ TESTE 2 — gerar imagem");
    const imgBuffer = await generateCard(avatar);
    console.log("IMAGEM GERADA, BYTES:", imgBuffer.length);

    const base64 = imgBuffer.toString("base64");

    console.log("📨 TESTE 2 — sendPhoto");
    const r2 = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          photo: `data:image/png;base64,${base64}`,
          caption: "DEBUG FOTO OK"
        })
      }
    );
    const j2 = await r2.json();
    console.log("TELEGRAM sendPhoto:", j2);
  } catch (e) {
    console.error("❌ ERRO sendPhoto", e);
  }

  res.json({ ok: true, debug: true });
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ DEBUG SERVER ONLINE");
});
