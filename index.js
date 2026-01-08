import express from "express";
import fetch from "node-fetch";
import sharp from "sharp";
import FormData from "form-data";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// ================= UTIL =================
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

// ================= AVATAR MINI + OVERLAY =================
async function generateMiniAvatar(username, eventType) {
  const avatarUrl =
    `https://my-secondlife-agni.akamaized.net/users/${username}/sl_image.png`;

  const response = await fetch(avatarUrl);
  const buffer = await response.arrayBuffer();

  const label = eventType === "ENTROU" ? "ENTROU" : "SAIU";
  const color = eventType === "ENTROU" ? "#2ECC71" : "#E74C3C";

  const overlaySVG = `
    <svg width="96" height="96">
      <rect x="0" y="68" width="96" height="28"
            fill="${color}" opacity="0.9"/>
      <text x="48" y="88"
            font-size="14"
            fill="white"
            text-anchor="middle"
            font-family="Arial, Helvetica, sans-serif"
            font-weight="bold">
        ${label}
      </text>
    </svg>
  `;

  const finalImage = await sharp(Buffer.from(buffer))
    .resize(96, 96, { fit: "cover" })
    .composite([{ input: Buffer.from(overlaySVG) }])
    .png()
    .toBuffer();

  return finalImage;
}

// ================= TELEGRAM PHOTO =================
async function sendMiniAvatar(username, event, caption) {
  const imageBuffer = await generateMiniAvatar(username, event);

  const form = new FormData();
  form.append("chat_id", TELEGRAM_CHAT_ID);
  form.append("caption", caption);
  form.append("photo", imageBuffer, "avatar.png");

  const r = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendPhoto`,
    {
      method: "POST",
      body: form
    }
  );

  console.log("📸 sendPhoto:", await r.text());
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
    // EVENTO COM FOTO MINI
    if (event && username) {
      const caption =
        (event === "ENTROU" ? "🟢 ENTROU\n" : "🔴 SAIU\n") +
        `👤 ${username}\n` +
        `📍 Região: ${region}\n` +
        `🏡 Parcel: ${parcel}`;

      await sendMiniAvatar(username, event, caption);
    }

    // TEXTO NORMAL (PING / MENSAGEM MANUAL)
    else if (sl_message) {
      await sendText(sl_message);
    }
  } catch (e) {
    console.error("❌ ERRO:", e.message);
  }

  res.json({ ok: true });
});

// ================= STATUS =================
app.get("/", (req, res) => {
  res.send("ILHA SALINAS backend ONLINE 🚀");
});

app.listen(process.env.PORT || 3000, () =>
  console.log("🚀 Backend Railway ONLINE")
);
