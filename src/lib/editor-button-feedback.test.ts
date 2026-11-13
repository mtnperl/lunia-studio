import { expect, it, vi } from "vitest";
import { acknowledgeButton } from "./editor-button-feedback";

it("acknowledges repeat presses and ignores genuinely disabled controls", () => {
  const cancel = vi.fn();
  const button = { disabled: false, getAttribute: () => null,
    getAnimations: () => [{ animationName: "editor-button-ack", cancel }],
    removeAttribute: vi.fn(), setAttribute: vi.fn(), offsetWidth: 32 };
  acknowledgeButton(button as unknown as HTMLButtonElement);
  expect(cancel).toHaveBeenCalledOnce();
  expect(button.setAttribute).toHaveBeenCalledWith("data-acknowledged", "true");
  button.disabled = true;
  button.setAttribute.mockClear();
  acknowledgeButton(button as unknown as HTMLButtonElement);
  expect(button.setAttribute).not.toHaveBeenCalled();
});
