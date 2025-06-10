module ReminderConcern
  extend ActiveSupport::Concern

  def broadcast_reminder_update(reminders)
    Turbo::StreamsChannel.broadcast_update_to(
      "home",
      target: "reminders",
      partial: "shared/reminder_update",
      locals: { reminders: reminders }
    )
  end
end