/**
 * @param {Object} opts  { forecast }
 * @this {import("@hotwired/stimulus").Controller}  bound to your Jarvis controller
 */
export async function handleGetWeather(opts) {
  this.transcriptTarget.textContent = `Jarvis: Buscando tempo para Cascavel...`;

  let weatherUrl = `https://api.weatherapi.com/v1/forecast.json`
    + `?key=${this.weatherApiKeyValue}`
    + `&q=${encodeURIComponent(this.homeCoordinatesValue)}`
    + `&days=2&lang=pt`;

  try {
    const response = await fetch(weatherUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    const data = await response.json();

    let dayIndex = opts.forecast === "tomorrow" ? 1 : 0;
    const day = data.forecast.forecastday[dayIndex].day;
    const current = data.current;

    const weatherResult = {
      location: `${data.location.name}, ${data.location.region}, ${data.location.country}`,
      avg_temp: opts.forecast === "current" ? current.temp_c : day.avgtemp_c,
      max_temp: day.maxtemp_c,
      min_temp: day.mintemp_c,
      condition:
        opts.forecast === "current"
          ? current.condition.text
          : day.condition.text,
      chance_of_rain: day.daily_chance_of_rain,
    };
    console.log("Weather data received:", weatherResult);

    let response_instruction =
      `Tempo em ${weatherResult.location} — ` +
      `${weatherResult.avg_temp}°C (máx ${weatherResult.max_temp}°C, mín ${weatherResult.min_temp}°C), ` +
      `${weatherResult.condition}, chuva: ${weatherResult.chance_of_rain}%.`;

    const followUp = {
      type: "response.create",
      response: {
        modalities: ["audio", "text"],
        instructions:
          "Responda com o tempo atual e adicione um emoji correspondente à condição do dia *SEM FALTA*: " +
          response_instruction,
      },
    };
    this.dataChannel.send(JSON.stringify(followUp));
  } catch (error) {
    console.error("Error fetching weather:", error);
    this.transcriptTarget.textContent =
      "Jarvis: Erro ao buscar informações do tempo.";
  }
}
