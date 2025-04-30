/**
 * @param {Object} opts  { forecast }
 * @this {import("@hotwired/stimulus").Controller}  bound to your Jarvis controller
 */
export async function handleGetWeather(opts) {
  this.transcriptTarget.textContent = `Jarvis: Buscando tempo para Cascavel...`;

  try {
    const resp = await fetch(
      `/api/v1/weathers?forecast=${encodeURIComponent(opts.forecast)}`,
      { headers: { "Accept": "application/json" } }
    );
    if (!resp.ok) throw new Error(`Status ${resp.status}`);

    const weather = await resp.json();
    // { location, avg_temp, max_temp, min_temp, condition, chance_of_rain }

    const {
      location,
      avg_temp,
      max_temp,
      min_temp,
      condition,
      chance_of_rain
    } = weather;

    console.log("Weather data received from Rails:", weather);

    let response_instruction =
      `Tempo em ${location} — ` +
      `${avg_temp}°C (máx ${max_temp}°C, mín ${min_temp}°C), ` +
      `${condition}, chuva: ${chance_of_rain}%.`;

    const followUp = {
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions:
          "Responda com o tempo atual e adicione um emoji correspondente à condição do dia *SEM FALTA*: " +
          response_instruction
      }
    };
    this.dataChannel.send(JSON.stringify(followUp));
  } catch (err) {
    console.error("Error fetching weather from Rails:", err);
    this.transcriptTarget.textContent =
      "Jarvis: Erro ao buscar informações do tempo.";
  }
}
