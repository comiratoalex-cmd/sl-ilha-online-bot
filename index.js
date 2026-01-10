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
 "https://script.google.com/macros/s/AKfycbzwyzWzqxCRfhrrTksDJ9fD_CDtSH-TwWdIwsiGQDZCb2f_nuHKRcqN4P8hA6ULEFQM7A/exec";

async function loadStaff() {
  try {
    const res = await fetch(STAFF_URL);
    const text = await res.text();

    if (!text.trim().startsWith("[")) {
      throw new Error("Resposta não é JSON: " + text.slice(0, 50));
    }

    STAFF = JSON.parse(text);
    console.log("👑 Staff carregado:", STAFF);
  } catch (e) {
    console.error("❌ Erro ao carregar staff:", e.message);
  }
}

loadStaff();
setInterval(loadStaff, 60000);

function isStaffTelegram(msg) {
  return STAFF.includes(msg.from.id);
}

// ================= ANTI-SPAM =================
const DEBOUNCE_TIME = 15000;
const lastEvent = new Map();

// ================= ONLINE =================
let onlineUsers = [];
let lastOnlineUpdate = null;

// ================= TELEGRAM → SL =================
let lastMessageToSL = "";

// ================= BANLIST =================
let BANLIST_BUFFER = [];
let BANLIST_WAITING_CHAT = null;

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

// ================= SL → TELEGRAM (ENTRADA / SAÍDA) =================
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
      `👤 ${username}\n📍 ${region}\n🏡 ${parcel}\n🕒 ${nowFormatted()}`;

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text })
    });

    res.json({ ok: true });
  } catch (e) {
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

// ================= BANLIST (LSL → BACKEND) =================
app.post("/banlist", async (req, res) => {
  const data = req.body;

  if (data.done) {
    if (!BANLIST_WAITING_CHAT) return res.json({ ok: true });

    let text = "🚫 Banidos do parcel\n\n";

    if (!BANLIST_BUFFER.length) {
      text += "Nenhum banido.";
    } else {
      BANLIST_BUFFER.forEach(u => {
        text += `${u.online ? "🟢" : "⚪"} ${u.name}\n`;
      });
    }

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: BANLIST_WAITING_CHAT,
        text
      })
    });

    BANLIST_BUFFER = [];
    BANLIST_WAITING_CHAT = null;
    return res.json({ ok: true });
  }

  BANLIST_BUFFER.push(data);
  res.json({ ok: true });
});

// ================= TELEGRAM =================
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const command = text.split(" ")[0].split("@")[0];

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

    BANLIST_BUFFER = [];
    BANLIST_WAITING_CHAT = chatId;
    lastMessageToSL = "GET_BANLIST";

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "📋 Buscando lista de banidos..."
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
