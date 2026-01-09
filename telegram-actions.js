app.post("/telegram/webhook", async (req, res) => {
  const update = req.body;

  // Clique em botão
  if (update.callback_query) {
    const cb = update.callback_query;
    const data = cb.data;
    const chatId = cb.message.chat.id;

    // ================= SELEÇÃO DE USUÁRIO =================
    if (data.startsWith("user:")) {
      const username = data.replace("user:", "");

      await fetch(
        `https://api.telegram.org/bot${TOKEN}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: `⚙️ Ações para *${username}*`,
            parse_mode: "Markdown",
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "🚪 Eject", callback_data: `action:EJECT|${username}` },
                  { text: "🚫 Ban", callback_data: `action:BAN|${username}` }
                ],
                [
                  { text: "🔇 Mute", callback_data: `action:MUTE|${username}` },
                  { text: "⬅️ Voltar", callback_data: "back" }
                ]
              ]
            }
          })
        }
      );
    }

    // ================= AÇÃO =================
    if (data.startsWith("action:")) {
      const raw = data.replace("action:", "");
      const [action, username] = raw.split("|");

      // Envia comando para o SL
      await sendActionToSL(action, username);

      await fetch(
        `https://api.telegram.org/bot${TOKEN}/answerCallbackQuery`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: cb.id,
            text: `✅ ${action} enviado para ${username}`
          })
        }
      );
    }
  }

  res.json({ ok: true });
});
