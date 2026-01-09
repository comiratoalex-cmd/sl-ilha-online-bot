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
    console.log("SL CHEGOU:", req.body);

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

    const payload = {
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
    };

    const tgRes = await fetch(
      `https://api.telegram.org/bot${TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      }
    );

    const tgJson = await tgRes.json();
    console.log("TELEGRAM:", tgJson);

    res.json({ ok: true });
  } catch (err) {
    console.error("❌ ERRO SL:", err);
    res.status(500).json({ error: err.message });
  }
});

// ================= SL → BACKEND (LISTA ONLINE) =================
app.post("/online", (req, res) => {
  const { users } = req.body;

  if (!Array.isArray(users)) {
    return res.status(400).json({ error: "users inválido" });
  }

  onlineUsers = users;
  lastOnlineUpdate = new Date();

  console.log("ONLINE ATUALIZADO:", onlineUsers.length);
  res.json({ ok: true });
});

// ================= TELEGRAM COMANDO /online =================
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.json({ ok: true });

  const chatId = msg.chat.id;

  if (msg.text === "/online") {
    let response;

    if (onlineUsers.length === 0) {
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

  res.json({ ok: true });
});

// ================= START =================
app.listen(process.env.PORT || 3000, () => {
  console.log("✅ ILHA SALINAS — TELEGRAM ONLINE + /online ATIVO");
});
