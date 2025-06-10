class CreateReminders < ActiveRecord::Migration[8.0]
  def change
    create_table :reminders do |t|
      t.string :title, null: false
      t.text :description
      t.boolean :urgent, default: false
      t.boolean :completed, default: false
      t.datetime :reminder_time
      t.references :user, null: false, foreign_key: true
      t.timestamps
    end
  end
end
