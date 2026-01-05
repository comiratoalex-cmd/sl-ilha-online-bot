/**
 * Backend ONLINE + PICOS
 * Diario, Semanal, Mensal, Anual
 */

function getKeyDates() {
  const now = new Date();

  const year = now.getFullYear();
  const month = year + "-" + (now.getMonth() + 1);
  const day = month + "-" + now.getDate();

  // Semana ISO simples (ano-semana)
  const firstJan = new Date(year, 0, 1);
  const week = Math.ceil(
    (((now - firstJan) / 86400000) + firstJan.getDay() + 1) / 7
  );
  const weekKey = year + "-W" + week;

  return { year, month, day, weekKey };
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const data = JSON.parse(e.postData.contents);

    let online = Number(data.online);
    if (isNaN(online)) online = 0;

    const dates = getKeyDates();

    // ONLINE atual
    props.setProperty("online", online);

    // -------- DIARIO --------
    if (props.getProperty("day_key") !== dates.day) {
      props.setProperty("day_key", dates.day);
      props.setProperty("peak_day", 0);
    }

    let peakDay = Number(props.getProperty("peak_day") || 0);
    if (online > peakDay) {
      props.setProperty("peak_day", online);
    }

    // -------- SEMANAL --------
    if (props.getProperty("week_key") !== dates.weekKey) {
      props.setProperty("week_key", dates.weekKey);
      props.setProperty("peak_week", 0);
    }

    let peakWeek = Number(props.getProperty("peak_week") || 0);
    if (online > peakWeek) {
      props.setProperty("peak_week", online);
    }

    // -------- MENSAL --------
    if (props.getProperty("month_key") !== dates.month) {
      props.setProperty("month_key", dates.month);
      props.setProperty("peak_month", 0);
    }

    let peakMonth = Number(props.getProperty("peak_month") || 0);
    if (online > peakMonth) {
      props.setProperty("peak_month", online);
    }

    // -------- ANUAL --------
    if (props.getProperty("year_key") !== String(dates.year)) {
      props.setProperty("year_key", dates.year);
      props.setProperty("peak_year", 0);
    }

    let peakYear = Number(props.getProperty("peak_year") || 0);
    if (online > peakYear) {
      props.setProperty("peak_year", online);
    }

    props.setProperty("updated", new Date().toISOString());

    return ContentService.createTextOutput(JSON.stringify({
      online,
      peak_day: Number(props.getProperty("peak_day")),
      peak_week: Number(props.getProperty("peak_week")),
      peak_month: Number(props.getProperty("peak_month")),
      peak_year: Number(props.getProperty("peak_year")),
      updated: props.getProperty("updated")
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(
      JSON.stringify({ error: err.message })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet() {
  const props = PropertiesService.getScriptProperties();

  return ContentService.createTextOutput(JSON.stringify({
    online: Number(props.getProperty("online") || 0),
    peak_day: Number(props.getProperty("peak_day") || 0),
    peak_week: Number(props.getProperty("peak_week") || 0),
    peak_month: Number(props.getProperty("peak_month") || 0),
    peak_year: Number(props.getProperty("peak_year") || 0),
    updated: props.getProperty("updated") || null
  })).setMimeType(ContentService.MimeType.JSON);
}
