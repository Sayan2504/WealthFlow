# config/routes.rb
# frozen_string_literal: true

Rails.application.routes.draw do
  devise_for :users

  root "dashboard#index"

  resources :calculators, only: [:index] do
    collection do
      post :fd
      post :rd
      post :sip
      post :epf
    end
  end

  # Domain specific resources for CRUD entries & NAV sync
  resources :mutual_funds, only: [:index, :new, :create, :show, :destroy] do
    collection do
      post :sync_nav
    end
  end

  resources :deposit_accounts, only: [:index, :new, :create, :show, :destroy] do
    resources :transactions, controller: "deposit_transactions", only: [:create]
  end

  resources :provident_funds, only: [:index, :new, :create, :show] do
    resources :ledgers, controller: "provident_fund_ledgers", only: [:create]
  end

  resources :insurance_policies, only: [:index, :new, :create, :show, :destroy]
end
