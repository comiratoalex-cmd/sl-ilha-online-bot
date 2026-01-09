import express from "express";

const app = express();
app.use(express.json({ limit: "2mb" }));

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

if (!TOKEN || !CHAT_ENTRADA || !CHAT_SAIDA) {
  console.error("❌ Variáveis de ambiente ausentes");
  process.exit(1);
}

// ================= ANTI-SPAM =================
const DEBOUNCE_TIME = 15000;
const lastEvent = new Map();

// ================= ONLINE =================
let onlineUsers = [];
let lastOnlineUpdate = null;

// ================= TELEGRAM → SL =================
let lastMessageToSL = "";

// ================= UTIL =================
function nowFormatted() {
  return new Date().toLocaleString("pt-BR", {
    timeZone: "Europe/Dublin",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function isSpam(username, event) {
  const key = `${username}:${event}`;
  const now = Date.now();
  if (lastEvent.has(key) && now - lastEvent.get(key) < DEBOUNCE_TIME) {
    return true;
  }
  lastEvent.set(key, now);
  return false;
}

// ================= SL → TELEGRAM =================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, region, parcel, slurl } = req.body;
    if (!event || !username || !region || !parcel || !slurl)
      return res.status(400).json({ error: "Payload incompleto" });

    if (isSpam(username, event))
      return res.json({ ok: true, skipped: true });

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;

    const text =
      `${event === "ENTROU" ? "🟢 ENTRADA" : "🔴 SAÍDA"}\n\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}\n` +
      `🕒 ${nowFormatted()}`;

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [[{ text: "📍 Abrir no mapa", url: slurl }]]
        }
      })
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// ================= SL → ONLINE =================
app.post("/online", (req, res) => {
  if (!Array.isArray(req.body.users))
    return res.status(400).json({ error: "users inválido" });

  onlineUsers = req.body.users;
  lastOnlineUpdate = new Date();
  res.json({ ok: true });
});

// ================= TELEGRAM WEBHOOK =================
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const command = text.split(" ")[0].split("@")[0];

  // /online
  if (command === "/online") {
    const response = onlineUsers.length
      ? `🟢 Usuários online (${onlineUsers.length})\n\n` +
        onlineUsers.map(u => `👤 ${u}`).join("\n") +
        `\n\n🕒 ${lastOnlineUpdate.toLocaleTimeString("pt-BR")}`
      : "🔴 Ninguém online no momento.";

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: response })
    });
  }

  // /say
  if (command === "/say") {
    const message = text.replace(/^\/say(@\w+)?\s*/i, "");
    if (!message) return res.json({ ok: true });

    const from = msg.from.username || msg.from.first_name || "Telegram";
    lastMessageToSL = `📢 Telegram (${from}):\n${message}`;

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "✅ Mensagem enviada ao grupo do SL"
      })
    });
  }

  res.json({ ok: true });
});

// ================= SL POLLING =================
app.get("/say", (req, res) => {
  if (!lastMessageToSL) return res.send("");
  const msg = lastMessageToSL;
  lastMessageToSL = "";
  res.send(msg);
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — TELEGRAM + SL ATIVO");
});
