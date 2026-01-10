// =====================================================
// === INTEGRAÇÃO STAFF / BANIDOS (ILHA SALINAS) ===
// NÃO ALTERA FUNÇÕES EXISTENTES
// =====================================================

// Função utilitária para resposta JSON
function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// Função segura para pegar aba ignorando espaços/caixa
function getSheetSafeByName(ss, expectedName) {
  const sheets = ss.getSheets();
  expectedName = expectedName.trim().toUpperCase();

  for (var i = 0; i < sheets.length; i++) {
    var name = sheets[i].getName().trim().toUpperCase();
    if (name === expectedName) {
      return sheets[i];
    }
  }
  return null;
}

// Endpoint usado pelo index.js
function doGet(e) {
  var tab = (e && e.parameter && e.parameter.tab)
    ? e.parameter.tab.toUpperCase()
    : "";

  var ss = SpreadsheetApp.openById(sheetId);

  // ================= STAFF =================
  if (tab === "STAFF") {
    var sh = getSheetSafeByName(ss, "STAFF");
    if (!sh) return jsonResponse({ error: "Aba STAFF não encontrada" });

    var data = sh.getDataRange().getValues();
    var staff = [];

    for (var i = 1; i < data.length; i++) {
      var telegramId = data[i][0]; // Coluna A
      var ativo = String(data[i][3]).toUpperCase(); // Coluna D

      if (telegramId && ativo === "SIM") {
        staff.push(Number(telegramId));
      }
    }

    return jsonResponse(staff);
  }

  // ================= BANIDOS =================
  if (tab === "BANIDOS") {
    var sh = getSheetSafeByName(ss, "BANIDOS");
    if (!sh) return jsonResponse({ error: "Aba BANIDOS não encontrada" });

    var data = sh.getDataRange().getValues();
    var banidos = [];

    for (var i = 1; i < data.length; i++) {
      var name = data[i][0]; // Coluna A
      var uuid = data[i][1]; // Coluna B
      var ativo = String(data[i][2]).toUpperCase(); // Coluna C

      if (uuid && ativo === "SIM") {
        banidos.push({
          name: name,
          uuid: uuid
        });
      }
    }

    return jsonResponse(banidos);
  }

  // Fallback
  return jsonResponse({ status: "ok" });
}
