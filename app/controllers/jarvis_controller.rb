class JarvisController < ApplicationController
  def create_openai_realtime_session
    session_data = RealtimeSessionService.new.create_realtime_session
    render json: { realtime_session: session_data }
  rescue => e
    Rails.logger.error("Falha ao criar sessão realtime: #{e.message}")
    render json: { error: e.message }, status: :unprocessable_entity
  end
end
