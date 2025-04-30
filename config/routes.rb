Rails.application.routes.draw do
  get "home/index"
  root "home#index"
  post "/jarvis/create_openai_realtime_session", to: "jarvis#create_openai_realtime_session"

  namespace :api do
    namespace :v1 do
      resources :weathers, only: [ :index ]
    end
  end
end
