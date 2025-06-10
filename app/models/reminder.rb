class Reminder < ApplicationRecord
  belongs_to :user, class_name: "User", foreign_key: "user_id", optional: true

  validates :title, presence: true
end
