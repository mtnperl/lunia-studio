/** A short press acknowledgement, independent of how long the action takes. */
export function acknowledgeButton(button: HTMLButtonElement) {
  if (button.disabled || button.getAttribute("aria-disabled") === "true") return;
  button.getAnimations().filter((animation) => (animation as CSSAnimation).animationName === "editor-button-ack").forEach((animation) => animation.cancel());
  button.removeAttribute("data-acknowledged");
  // Restart CSS feedback for rapid repeat clicks without timers or component state.
  void button.offsetWidth;
  button.setAttribute("data-acknowledged", "true");
}
