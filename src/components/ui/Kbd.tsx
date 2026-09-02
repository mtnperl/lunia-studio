/** Keyboard key cap. Pass one key per element: `<Kbd>⌘</Kbd><Kbd>K</Kbd>`. */
export function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="ui-kbd">{children}</kbd>;
}

/** Renders "mod+shift+k" as a row of key caps, mapping `mod` to ⌘ on Mac and
 *  Ctrl elsewhere. Safe on the server (defaults to ⌘). */
export function Shortcut({ keys }: { keys: string }) {
  const isMac = typeof navigator === "undefined" ? true : /Mac|iPhone|iPad/.test(navigator.platform);
  const map: Record<string, string> = {
    mod: isMac ? "⌘" : "Ctrl", shift: "⇧", alt: isMac ? "⌥" : "Alt", ctrl: "Ctrl",
    enter: "↩", esc: "Esc", up: "↑", down: "↓", left: "←", right: "→", backspace: "⌫", tab: "⇥",
  };
  return (
    <span style={{ display: "inline-flex", gap: 2 }} aria-label={keys.replace(/\+/g, " ")}>
      {keys.split("+").map((k, i) => <Kbd key={i}>{map[k.toLowerCase()] ?? k.toUpperCase()}</Kbd>)}
    </span>
  );
}
