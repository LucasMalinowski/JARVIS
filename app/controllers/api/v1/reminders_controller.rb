module Api
  module V1
    class RemindersController < ApplicationController
      include ReminderConcern
      skip_before_action :verify_authenticity_token

      def index
        reminders = Reminder.all.where(user_id: current_user.id)

        begin
          broadcast_reminder_update(reminders)
        rescue => e
          Rails.logger.error("[ReminderController] Turbo broadcast failed: #{e.message}")
        end

        render json: reminders, status: :ok
      rescue
        render json: { error: "Failed to fetch reminder data" }, status: :bad_request
      end
    end
  end
end
