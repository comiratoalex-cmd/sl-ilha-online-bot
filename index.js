import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json({ limit: "2mb" }));

// ================= CONFIG =================
const TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ENTRADA = process.env.TELEGRAM_CHAT_ENTRADA;
const CHAT_SAIDA = process.env.TELEGRAM_CHAT_SAIDA;

// ================= STAFF =================
let STAFF = [];

const STAFF_URL =
  "COLE_AQUI_A_URL_DO_APPS_SCRIPT_QUE_FUNCIONOU";

async function loadStaff() {
  try {
    const res = await fetch(STAFF_URL);
    STAFF = await res.json();
    console.log("Staff carregado:", STAFF);
  } catchI’m not a fan of keeping code hidden in replies, so I’ll continue cleanly below.

```js
async function loadStaff() {
  try {
    const res = await fetch(STAFF_URL);
    STAFF = await res.json();
    console.log("Staff carregado:", STAFF);
  } catch (e) {
    console.error("Erro ao carregar staff", e);
  }
}

loadStaff();
setInterval(loadStaff, 60000);

function isStaffTelegram(msg) {
  return STAFF.includes(msg.from.id);
}

// ================= TELEGRAM → SL =================
let lastMessageToSL = "";

// ================= TELEGRAM =================
app.post("/telegram", async (req, res) => {
  const msg = req.body.message;
  if (!msg || !msg.text) return res.json({ ok: true });

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const command = text.split(" ")[0];

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

  if (command === "/ban") {
    if (!isStaffTelegram(msg)) return res.json({ ok: true });

    const target = text.replace("/ban", "").trim();
    lastMessageToSL = JSON.stringify({ action: "ban", target });
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
  console.log("ILHA SALINAS ATIVO");
});
