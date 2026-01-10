import express from "express";
import fetch from "node-fetch";

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

// ================= STAFF (GOOGLE SHEETS) =================
let STAFF = [];

const STAFF_URL =
  "https://script.google.com/macros/s/AKfycbymRPp602CAxIkTKteILBrklhbPUxIl2Wjx0QwYOpoDj1uSI02Pm2agJ3CrEUdjd5Ts/exec";

// ================= BANLIST (GOOGLE SHEETS) =================
const BANLIST_URL =
  "https://script.google.com/macros/s/AKfycbymRPp602CAxIkTKteILBrklhbPUxIl2Wjx0QwYOpoDj1uSI02Pm2agJ3CrEUdjd5Ts/exec";

// ================= LOAD STAFF =================
async function loadStaff() {
  try {
    const res = await fetch(STAFF_URL);
    STAFF = await res.json();
    console.log("👑 Staff carregado:", STAFF);
  } catch (e) {
    console.error("❌ Erro ao carregar staff", e);
  }
}

loadStaff();
setInterval(loadStaff, 60000);

function isStaffTelegram(msg) {
  const id = msg.from?.id || msg.sender_chat?.id;
  return STAFF.includes(id);
}

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

// ================= SL → TELEGRAM (ENTRADA / SAÍDA) =================
app.post("/sl", async (req, res) => {
  const { event, username, region, parcel, slurl } = req.body;
  if (!event || !username || !region || !parcel || !slurl)
    return res.status(400).json({ error: "Payload incompleto" });

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

  // /banlist (VIA PLANILHA)
  if (command === "/banlist") {
    if (!isStaffTelegram(msg)) {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "⛔ Você não tem permissão."
        })
      });
      return res.json({ ok: true });
    }

    const r = await fetch(BANLIST_URL);
    const list = await r.json();

    if (!list.length) {
      await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "🚫 Nenhum banido no momento."
        })
      });
      return res.json({ ok: true });
    }

    let out = "🚫 Banidos (planilha)\n\n";
    list.forEach(u => (out += `⚪ ${u.name}\n`));

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: out })
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
