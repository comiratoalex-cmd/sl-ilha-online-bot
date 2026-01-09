import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";
import FormData from "form-data";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = -1003540960692;

// ================= TEXTO =================
async function sendText(text) {
  const r = await fetch(
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
  console.log("📤 sendMessage:", await r.text());
}

// ================= AVATAR MINI =================
async function generateMiniAvatar(username) {
  const avatarUrl =
    `https://my-secondlife-agni.akamaized.net/users/${username}/sl_image.png`;

  const response = await fetch(avatarUrl);
  const buffer = await response.arrayBuffer();

  // Gera imagem pequena (96x96)
  const mini = await sharp(Buffer.from(buffer))
    .resize(96, 96, { fit: "cover" })
    .png()
    .toBuffer();

  return mini;
}

// ================= FOTO (MINI) =================
async function sendMiniPhoto(username, caption) {
  const imageBuffer = await generateMiniAvatar(username);

  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("caption", caption);
  form.append("photo", imageBuffer, "avatar.png");
  form.append("parse_mode", "Markdown");

  const r = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    {
      method: "POST",
      body: form
    }
  );

  console.log("📸 sendPhoto (mini):", await r.text());
}

// ================= ENDPOINT SL =================
app.post("/sl", async (req, res) => {
  const {
    sl_message,
    event,
    username,
    region,
    parcel
  } = req.body;

  try {
    // EVENTO COM FOTO PEQUENA
    if (event && username) {
      const caption =
        (event === "ENTROU" ? "🟢 *ENTROU*\n" : "🔴 *SAIU*\n") +
        `👤 ${username}\n` +
        `📍 Região: ${region}\n` +
        `🏡 Parcel: ${parcel}`;

      await sendMiniPhoto(username, caption);
    }
    // TEXTO NORMAL
    else if (sl_message) {
      await sendText(sl_message);
    }
  } catch (e) {
    console.error("❌ ERRO:", e.message);
  }

  res.json({ ok: true });
});

// ================= START =================
app.get("/", (req, res) => {
  res.send("ILHA SALINAS backend ONLINE 🚀");
});

app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Backend Railway ONLINE (avatar mini)")
);
