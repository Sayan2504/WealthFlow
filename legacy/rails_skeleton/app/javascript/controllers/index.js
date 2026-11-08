// app/javascript/controllers/index.js
import { Application } from "@hotwired/stimulus"
import FinancialMetricController from "./financial_metric_controller"
import AutoSubmitController from "./auto_submit_controller"
import InstantCalculatorController from "./instant_calculator_controller"
import ModalController from "./modal_controller"
import CustomSelectController from "./custom_select_controller"

const application = Application.start()
application.debug = false
window.Stimulus = application

application.register("financial-metric", FinancialMetricController)
application.register("auto-submit", AutoSubmitController)
application.register("instant-calculator", InstantCalculatorController)
application.register("modal", ModalController)
application.register("custom-select", CustomSelectController)

export { application }
