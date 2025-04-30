module WeatherConcern
  extend ActiveSupport::Concern

  def broadcast_weather_update(weather_data)
    forecast_data = weather_data["forecast"]["forecastday"].map do |day|
      {
        date: day["date"],
        max_temp: day["day"]["maxtemp_c"],
        min_temp: day["day"]["mintemp_c"],
        rain_chance: day["day"]["daily_chance_of_rain"],
        condition: day["day"]["condition"]["text"],
        condition_icon: day["day"]["condition"]["icon"]
      }
    end


    Turbo::StreamsChannel.broadcast_update_to(
      "home",
      target: "weather",
      partial: "shared/weather_update",
      locals: { forecast_data: forecast_data }
    )
  end
end