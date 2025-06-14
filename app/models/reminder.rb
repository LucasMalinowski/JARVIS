class Reminder < ApplicationRecord
  belongs_to :user, class_name: "User", foreign_key: "user_id", optional: true

  validates :title, presence: true

  scope :incomplete, -> { where(completed: false) }

  def complete!
    update(completed: true)
  end

  def incomplete!
    update(completed: false)
  end
end
