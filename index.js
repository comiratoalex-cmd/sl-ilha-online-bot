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

// ================= ONLINE STATE =================
let onlineUsers = [];
let lastOnlineUpdate = null;

// ================= TELEGRAM → SL STATE =================
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

// =====================================================
// SL → TELEGRAM (ENTRADA / SAÍDA)
// =====================================================
app.post("/sl", async (req, res) => {
  try {
    const { event, username, region, parcel, slurl } = req.body;

    if (!event || !username || !region || !parcel || !slurl) {
      return res.status(400).json({ error: "Payload incompleto" });
    }

    if (isSpam(username, event)) {
      return res.json({ ok: true, skipped: true });
    }

    const chatId = event === "ENTROU" ? CHAT_ENTRADA : CHAT_SAIDA;
    const profileUrl =
      "https://my.secondlife.com/" + encodeURIComponent(username);

    const text =
      `${event === "ENTROU" ? "🟢 ENTRADA" : "🔴 SAÍDA"}\n\n` +
      `👤 ${username}\n` +
      `📍 Região: ${region}\n` +
      `🏡 Parcel: ${parcel}\n` +
      `🕒 ${nowFormatted()}`;

    await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "📍 Abrir no mapa", url: slurl },
                { text: "🖼 Ver perfil", url: profileUrl }
              ]
            ]
          }
        })
      }
    );

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO /sl:", err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// SL → BACKEND (LISTA ONLINE)
// =====================================================
app.post("/online", (req, res) => {
  const { users } = req.body;

  if (!Array.isArray(users)) {
    return res.status(400).json({ error: "users inválido" });
  }

  onlineUsers = users;
  lastOnlineUpdate = new Date();

  console.log("ONLINE ATUALIZADO:", users.length);
  res.json({ ok: true });
});

// =====================================================
// TELEGRAM → BACKEND (WEBHOOK)
// Comandos: /online  |  /say
// =====================================================
app.post("/telegram", async (req, res) => {
  console.log("TELEGRAM UPDATE:", JSON.stringify(req.body));

  const msg = req.body.message;
  if (!msg || !msg.text) return res.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text.trim();

  // aceita /comando ou /comando@BotName
  const command = text.split(" ")[0].split("@")[0];

  // ---------- /online ----------
  if (command === "/online") {
    let response;

    if (!onlineUsers.length) {
      response = "🔴 Ninguém online no momento.";
    } else {
      response =
        `🟢 Usuários online (${onlineUsers.length})\n\n` +
        onlineUsers.map(u => `👤 ${u}`).join("\n") +
        `\n\n🕒 Atualizado às ${lastOnlineUpdate.toLocaleTimeString("pt-BR")}`;
    }

    await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: response
        })
      }
    );
  }

  // ---------- /say ----------
  if (command === "/say") {
    const message = text.replace(/^\/say(@\w+)?\s*/i, "");

    if (!message) {
      await fetch(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "❌ Uso correto: /say sua mensagem"
          })
        }
      );
      return res.json({ ok: true });
    }

    const from = msg.from.username || msg.from.first_name || "Telegram";

    lastMessageToSL =
      "📢 Telegram (" + from + "):\n" + message;

    await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          text: "✅ Mensagem enviada ao grupo do SL"
        })
      }
    );
  }

  res.json({ ok: true });
});

// =====================================================
// SL → BACKEND (POLLING DA MENSAGEM DO TELEGRAM)
// =====================================================
app.get("/say", (req, res) => {
  if (!lastMessageToSL) {
    return res.send("");
  }

  const msg = lastMessageToSL;
  lastMessageToSL = ""; // limpa após leitura
  res.send(msg);
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — TELEGRAM + SL + /online + /say ATIVO");
});
