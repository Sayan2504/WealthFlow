Rails.application.routes.draw do
  devise_for :users, controllers: { registrations: "users/registrations" }

  # Health check endpoint for uptime monitoring
  get "up" => "rails/health#show", as: :rails_health_check

  # HTML Pages
  root "pages#dashboard"
  get "mutual_funds" => "pages#mutual_funds"
  get "fixed_income" => "pages#fixed_income"
  get "retirement" => "pages#retirement"
  get "insurance" => "pages#insurance"
  get "home_loan" => "pages#home_loan"
  get "banking" => "pages#banking"
  get "tax_calculator" => "pages#tax_calculator"

  # Session / Security PIN lock (bcrypt)
  post "session/pin", to: "sessions#set_pin"
  post "session/lock", to: "sessions#lock"
  post "session/unlock", to: "sessions#unlock"

  # Portfolio & Export API
  namespace :api do
    get "search", to: "search#index"
    post "fixed_income/slab_preview", to: "calculations#slab_preview"
    post "fixed_income/deposit_preview", to: "calculations#deposit_preview"
    post "mutual_funds/sip_projection", to: "calculations#sip_projection"
    get "export_csv", to: "portfolio#export_csv"
    get "export_excel", to: "portfolio#export_excel"
    post "clear_data", to: "portfolio#clear_data"
    match "statutory_rates", to: "portfolio#statutory_rates", via: %i[get post]
    post "save_item", to: "portfolio#save_item"
    post "delete_item", to: "portfolio#delete_item"
    post "tax_preview", to: "portfolio#tax_preview"

    # Mutual Funds & AMFI API
    get "mf_search", to: "mutual_funds#search"
    get "mf_nav", to: "mutual_funds#nav"
    get "mutual_funds/overlap", to: "mutual_funds#overlap"
    post "fetch_live_stocks", to: "mutual_funds#fetch_live_stocks"
    post "sync_all_stocks", to: "mutual_funds#sync_all_stocks"
    post "add_stock", to: "mutual_funds#add_stock"
    post "delete_stock", to: "mutual_funds#delete_stock"
    post "save_step_up", to: "mutual_funds#save_step_up"
    post "sync_navs", to: "mutual_funds#sync_navs"
  end
end
