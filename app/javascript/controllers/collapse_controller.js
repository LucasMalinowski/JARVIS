import { Controller } from "@hotwired/stimulus"

// Connects to data-controller="collapse"
export default class extends Controller {
  static targets = ["content", "button"];
  connect() {
  }

  toggle(event) {
    console.log("Toggle collapse triggered");
    event.preventDefault();
    this.contentTarget.classList.toggle("hidden");
    this.buttonTarget.classList.toggle("fa-caret-down");
    this.buttonTarget.classList.toggle("fa-caret-up");

  }
}
