import { Controller } from "@hotwired/stimulus";

export default class extends Controller {
  static targets = ["fullTranscript", "currentTranscript"];

  connect() {
    this.expanded = false;
  }

  toggle() {
    this.expanded = !this.expanded;
    this.fullTranscriptTarget.classList.toggle("hidden", !this.expanded);
    this.currentTranscriptTarget.classList.toggle("hidden", this.expanded);
    // Update the toggle button text
    const btn = this.element.querySelector("#toggleTranscript");
    btn.classList.toggle("fa-fade")
  }

  // Optional helper: If you want to add a new transcript line:
  addTranscriptLine(text) {
    // Append text to the full transcript
    let p = document.createElement("p");
    p.textContent = text;
    this.fullTranscriptTarget.appendChild(p);
    // Update current transcript with the latest line
    this.currentTranscriptTarget.textContent = text;
  }
}
