module Api
  module V1
    class ConversationsController < ApplicationController
      skip_before_action :verify_authenticity_token

      def create
        user_input = params[:message]
        ai_response = JarvisService.new.send_message(user_input)
        render json: { reply: ai_response }
      rescue StandardError => e
        render json: { error: e.message }, status: :unprocessable_entity
      end
    end
  end
end
