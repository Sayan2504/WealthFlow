# frozen_string_literal: true

module Api
  class SearchController < ApplicationController
    def index
      q = params[:q].to_s.strip
      payload = Search::GlobalSearchService.search_with_ai(user: current_user, query: q)
      render json: {
        ok: true,
        query: q,
        count: payload[:results].size,
        ai_insight: payload[:ai_insight],
        quick_prompts: payload[:quick_prompts],
        results: payload[:results]
      }
    end
  end
end
