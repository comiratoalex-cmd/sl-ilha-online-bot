import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

// =====================================================
// CONFIGURAÇÃO (Railway ENV)
// =====================================================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

// APPS SCRIPT (STAFF + BANIDOS)
const SHEETS_BASE_URL =
  "https://script.google.com/macros/s/AKfycbzwyzWzqxCRfhrrTksDJ9fD_CDtSH-TwWdIwsiGQDZCb2f_nuHKRcqN4P8hA6ULEFQM7A/exec";

if (!TOKEN || !CHAT_ENTRADA || !CHAT_SAIDA) {
  console.error("❌ Variáveis de ambiente ausentes");
  process.exit(1);
}

// =====================================================
// LISTAS
// =====================================================
let STAFF = [];
let BANIDOS = [];

// =====================================================
// CARREGAR LISTAS DA PLANILHA
// =====================================================
async function loadLists() {
  try {
    const staffRes = await fetch(`${SHEETS_BASE_URL}?tab=STAFF`);
    STAFF = await staffRes.json();

    const banRes = await fetch(`${SHEETS_BASE_URL}?tab=BANIDOS`);
    BANIDOS = await banRes.json();

    console.log("👑 STAFF recebido:", STAFF);
    console.log("🚫 BANIDOS recebidos:", BANIDOS.length);
  } catch (e) {
    console.error("❌ Erro ao carregar listas:", e);
  }
}

loadLists();
setInterval(loadLists, 60000);

// =====================================================
// PERMISSÃO (BLINDADA)
// =====================================================
function isStaff(msg) {
  const userId =
    msg.from?.id ||
    msg.sender_chat?.id ||
    msg.chat?.id;

  console.log("🔍 Checando permissão para ID:", userId);
  console.log("👑 STAFF atual:", STAFF);

  if (!Array.isArray(STAFF)) return false;
  return STAFF.includes(Number(userId));
}

// =====================================================
// ANTI-SPAM
// =====================================================
const DEBOUNCE_TIME = 15000;
const lastEvent = new Map();

function isSpam(username, event) {
  const key = `${username}:${event}`;
  const now = Date.now();
  if (lastEvent.has(key) && now - lastEvent.get(key) < DEBOUNCE_TIME) {
    return true;
  }
  lastEvent.set(key, now);
  return false;
}

// =====================================================
// ONLINE
// =====================================================
let onlineUsers = [];
let lastOnlineUpdate = null;

// =====================================================
// TELEGRAM → SL
// =====================================================
let lastMessageToSL = "";

// =====================================================
// UTIL
// =====================================================
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

function profileUrl(username) {
  return "https://my.secondlife.com/" + username.replace(/\s+/g, ".");
}

// =====================================================
// SL → TELEGRAM (ENTRADA / SAÍDA)
// =====================================================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, region, slurl } = req.body;

    if (!event || !username || !region || !slurl) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    if (isSpam(username, event)) {
      return res.json({ ok: true, skipped: true });
    }

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;

    const text =
      `${event === "ENTROU" ? "🟢 ENTRADA" : "🔴 SAÍDA"}\n\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏖 Local: PRAIA SALINAS\n` +
      `🕒 ${nowFormatted()}`;

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        reply_markup: {
          inline_keyboard: [
            [{ text: "📍 Abrir no mapa", url: slurl }],
            [{ text: "🖼 Ver foto do perfil", url: profileUrl(username) }]
          ]
        }
      })
    });

    res.json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

// =====================================================
// SL → ONLINE
// =====================================================
app.post("/online", (req, res) => {
  if (!Array.isArray(req.body.users)) {
    return res.status(400).json({ error: "users inválido" });
  }

  onlineUsers = req.body.users;
  lastOnlineUpdate = new Date();
  res.json({ ok: true });
});

// =====================================================
// TELEGRAM WEBHOOK
// =====================================================
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

    const from = msg.from.first_name || "Telegram";
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

  // /banlist
  if (command === "/banlist") {
    if (!isStaff(msg)) {
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

    if (!Array.isArray(BANIDOS) || !BANIDOS.length) {
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

    let out = "🚫 Banidos\n\n";
    BANIDOS.forEach(u => {
      out += `⚪ ${u.name}\n`;
    });

    await fetch(`https://api.telegram.org/bot${TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: out })
    });
  }

  res.json({ ok: true });
});

// =====================================================
// SL POLLING
// =====================================================
app.get("/say", (req, res) => {
  if (!lastMessageToSL) return res.send("");
  const msg = lastMessageToSL;
  lastMessageToSL = "";
  res.send(msg);
});

// =====================================================
// START
// =====================================================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — TELEGRAM + SL ATIVO");
});
