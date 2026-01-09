// =====================================================
// ILHA SALINAS — TELEGRAM COM THUMBNAIL PEQUENA (CACHE)
// =====================================================

import express from "express";
import fs from "fs";
import path from "path";
import { createCanvas, loadImage } from "canvas";

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

// ================= CACHE =================
const CACHE_DIR = path.join(process.cwd(), "cache", "thumbs");
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// ================= THUMBNAIL =================
async function getAvatarThumbnail(uuid) {
  const filePath = path.join(CACHE_DIR, `${uuid}.png`);

  // ✔ usa cache se existir
  if (fs.existsSync(filePath)) {
    return filePath;
  }

  // Foto do perfil do avatar
  const avatarURL = `https://secondlife.com/my/avatar/${uuid}`;

  const img = await loadImage(avatarURL);

  const SIZE = 120; // 🔥 controle total do tamanho
  const canvas = createCanvas(SIZE, SIZE);
  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.drawImage(img, 0, 0, SIZE, SIZE);

  fs.writeFileSync(filePath, canvas.toBuffer("image/png"));
  return filePath;
}

// ================= TELEGRAM =================
async function sendTelegramWithThumb(chatId, thumbPath, text, slurl) {
  const form = new FormData();

  form.append("chat_id", chatId);
  form.append("photo", fs.createReadStream(thumbPath));
  form.append("caption", text);
  form.append("parse_mode", "Markdown");

  if (slurl) {
    form.append(
      "reply_markup",
      JSON.stringify({
        inline_keyboard: [
          [{ text: "📍 Abrir no mapa", url: slurl }]
        ]
      })
    );
  }

  await fetch(
    `https://api.telegram.org/bot${TOKEN}/sendPhoto`,
    { method: "POST", body: form }
  );
}

// ================= ROUTE =================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, uuid, region, parcel, slurl } = req.body;

    if (!event || !username || !uuid || !region || !parcel) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;

    const text =
      `${event === "ENTROU" ? "🟢" : "🔴"} *${event}*\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}`;

    const thumbPath = await getAvatarThumbnail(uuid);

    await sendTelegramWithThumb(chatId, thumbPath, text, slurl);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — Telegram com thumbnail ativa");
});
