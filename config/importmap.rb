# Pin npm packages by running ./bin/importmap

pin "application"
pin "@hotwired/turbo-rails", to: "turbo.min.js"
pin "@hotwired/stimulus", to: "stimulus.min.js"
pin "@hotwired/stimulus-loading", to: "stimulus-loading.js"
pin_all_from "app/javascript/controllers", under: "controllers"
pin "@rails/request.js", to: "@rails--request.js.js" # @0.0.11
pin "services/get_weather", to: "services/get_weather.js"
pin "services/handle_reminder", to: "services/handle_reminder.js"
