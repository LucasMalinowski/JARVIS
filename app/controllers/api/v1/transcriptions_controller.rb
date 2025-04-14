module Api
  module V1
    class TranscriptionsController < ApplicationController
      skip_before_action :verify_authenticity_token

      def create
        if params[:audio]
          # Aqui você deve integrar com um serviço de transcrição.
          # Exemplo: transcription = YourTranscriptionService.new(params[:audio]).perform
          # Para ilustração, vamos retornar um texto fixo.
          transcription = ""  # Esse valor seria o resultado real da transcrição
          render json: { transcription: transcription }
        else
          render json: { error: "Nenhum áudio recebido" }, status: :unprocessable_entity
        end
      end
    end
  end
end
