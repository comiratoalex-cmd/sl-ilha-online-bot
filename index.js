// =====================================================
// ILHA SALINAS — TELEGRAM MINI-APP ADMIN
// =====================================================

import express from "express";

const app = express();
app.use(express.json());

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID; // grupo do menu

// Telegram IDs autorizados
const ADMINS = [
  123456789 // <-- SEU TELEGRAM ID
];

// Endpoint do SL para receber comandos
const SL_RELAY_URL = process.env.SL_RELAY_URL;

// ================= ESTADO =================
let ONLINE_USERS = [];
let STATS = {
  today: 0,
  totalEntries: 0,
  peak: 0
};

// ================= UTILS =================
const tg = (method, body) =>
  fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });

const isAdmin = id => ADMINS.includes(id);

// ================= MENU =================
async function sendMenu(chatId) {
  await tg("sendMessage", {
    chat_id: chatId,
    text:
      "🌴 *ILHA SALINAS — PAINEL*\n" +
      "━━━━━━━━━━━━━━\n" +
      "Selecione uma opção:",
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "👥 Usuários online", callback_data: "ONLINE" }],
        [{ text: "📣 Mensagem para a land", callback_data: "MSG_LAND" }],
        [{ text: "📊 Estatísticas", callback_data: "STATS" }],
        [{ text: "❌ Fechar", callback_data: "CLOSE" }]
      ]
    }
  });
}

// ================= TELEGRAM WEBHOOK =================
app.post("/telegram", async (req, res) => {
  const update = req.body;

  // Comando /menu
  if (update.message?.text === "/menu") {
    const userId = update.message.from.id;
    if (!isAdmin(userId)) {
      await tg("sendMessage", {
        chat_id: update.message.chat.id,
        text: "🚫 Acesso restrito a administradores."
      });
      return res.json({ ok: true });
    }
    await sendMenu(update.message.chat.id);
    return res.json({ ok: true });
  }

  // Comando /land
  if (update.message?.text?.startsWith("/land ")) {
    const userId = update.message.from.id;
    if (!isAdmin(userId)) return res.json({ ok: true });

    const msg = update.message.text.replace("/land ", "");
    await fetch(SL_RELAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: msg })
    });

    await tg("sendMessage", {
      chat_id: update.message.chat.id,
      text: "✅ Mensagem enviada à land."
    });

    return res.json({ ok: true });
  }

  // Botões
  if (update.callback_query) {
    const q = update.callback_query;
    const chatId = q.message.chat.id;
    const msgId = q.message.message_id;

    let text = "";
    let buttons = [];

    if (q.data === "ONLINE") {
      text =
        "👥 *Usuários online*\n" +
        "━━━━━━━━━━━━━━\n" +
        (ONLINE_USERS.length
          ? ONLINE_USERS.map(u => `• ${u}`).join("\n")
          : "_Nenhum usuário online_");
      buttons = [[{ text: "⬅️ Voltar", callback_data: "BACK" }]];
    }

    if (q.data === "STATS") {
      text =
        "📊 *Estatísticas*\n" +
        "━━━━━━━━━━━━━━\n" +
        `📅 Hoje: ${STATS.today}\n` +
        `📈 Pico online: ${STATS.peak}\n` +
        `🔢 Total entradas: ${STATS.totalEntries}`;
      buttons = [[{ text: "⬅️ Voltar", callback_data: "BACK" }]];
    }

    if (q.data === "MSG_LAND") {
      text =
        "📣 *Mensagem para a land*\n" +
        "━━━━━━━━━━━━━━\n" +
        "Use o comando:\n`/land sua mensagem`";
      buttons = [[{ text: "⬅️ Voltar", callback_data: "BACK" }]];
    }

    if (q.data === "BACK") {
      await sendMenu(chatId);
      return res.json({ ok: true });
    }

    if (q.data === "CLOSE") {
      await tg("deleteMessage", { chat_id: chatId, message_id: msgId });
      return res.json({ ok: true });
    }

    await tg("editMessageText", {
      chat_id: chatId,
      message_id: msgId,
      text,
      parse_mode: "Markdown",
      reply_markup: { inline_keyboard: buttons }
    });
  }

  res.json({ ok: true });
});

// ================= SL → BACKEND =================

// ENTRADA / SAÍDA
app.post("/sl", (req, res) => {
  const { event, username } = req.body;

  if (event === "ENTROU") {
    STATS.today++;
    STATS.totalEntries++;
  }

  STATS.peak = Math.max(STATS.peak, ONLINE_USERS.length);
  res.json({ ok: true });
});

// LISTA ONLINE
app.post("/online", (req, res) => {
  ONLINE_USERS = req.body.users || [];
  res.json({ ok: true });
});

// ================= START =================
app.listen(process.env.PORT || 3000, () =>
  console.log("✅ ILHA SALINAS — MINI APP ADMIN ATIVO")
);
