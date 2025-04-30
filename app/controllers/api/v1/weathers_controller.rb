module Api
  module V1
    class WeathersController < ApplicationController
      include WeatherConcern
      skip_before_action :verify_authenticity_token

      def index
        # Fetch the weather data from the OpenWeatherMap API
        weatherUrl = "https://api.weatherapi.com/v1/forecast.json?key=#{Rails.application.credentials.weather_api_key}&q=#{Rails.application.credentials.home_coordinates}&days=2&lang=pt"

        response = Faraday.get(weatherUrl)
        if response.status == 200
          weather_data = JSON.parse(response.body)

          day_index = params[:forecast] == "tomorrow" ? 1 : 0
          day_data = weather_data["forecast"]["forecastday"][day_index]["day"]
          current_weather = weather_data["current"]

          weather_result = {
            location: "#{weather_data["location"]["name"]}, #{weather_data["location"]["region"]}, #{weather_data["location"]["country"]}",
            avg_temp: params[:forecast] == "current" ? current_weather["temp_c"] : day_data["avgtemp_c"],
            max_temp: day_data["maxtemp_c"],
            min_temp: day_data["mintemp_c"],
            condition: params[:forecast] == "current" ? current_weather["condition"]["text"] : day_data["condition"]["text"],
            chance_of_rain: day_data["daily_chance_of_rain"]
          }

          begin
            broadcast_weather_update(weather_data)
          rescue => e
            Rails.logger.error("[WeathersController] Turbo broadcast failed: #{e.message}")
          end

          render json: weather_result, status: :ok
        else
          render json: { error: "Failed to fetch weather data" }, status: :bad_request
        end
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
