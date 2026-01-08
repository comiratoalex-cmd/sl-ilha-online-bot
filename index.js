import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_CHAT_ID = -1003540960692;

// ================= TELEGRAM =================
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

async function sendPhoto(username, caption) {
  const photoUrl =
    `https://my-secondlife-agni.akamaized.net/users/${username}/sl_image.png`;

  const r = await fetch(
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

  console.log("📸 sendPhoto:", await r.text());
}

// ================= ENDPOINT SL =================
app.post("/sl", async (req, res) => {
  const {
    sl_message,
    event,
    username,
    region,
    parcel,
    slurl
  } = req.body;

  try {
    if (event && username) {
      const caption =
        (event === "ENTROU" ? "🟢 *ENTROU*\n" : "🔴 *SAIU*\n") +
        `👤 ${username}\n` +
        `📍 Região: ${region}\n` +
        `🏡 Parcel: ${parcel}\n` +
        `🌍 ${slurl}`;

      await sendPhoto(username, caption);
    }
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
  console.log("🚀 Backend Railway ONLINE")
);
