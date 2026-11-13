/** Update the preview in place. Keep the document, image nodes and loaded fonts. */
export function syncEmailPreview(doc: Document, html: string) {
  const next = new DOMParser().parseFromString(html, "text/html");
  function attrs(current: Element, desired: Element) {
    for (const attr of [...current.attributes]) {
      if (!desired.hasAttribute(attr.name)) current.removeAttribute(attr.name);
    }
    for (const attr of [...desired.attributes]) {
      if (current.getAttribute(attr.name) !== attr.value) current.setAttribute(attr.name, attr.value);
    }
  }
  const key = (node: Node) => node.nodeType === 1
    ? (node as Element).getAttribute("data-lunia-block") || (node as Element).getAttribute("data-lunia-slot") : null;
  function children(current: Node, desired: Node) {
    let cursor = current.firstChild;
    for (const source of [...desired.childNodes]) {
      // The initial preview script owns document-level listeners. Never rerun it.
      if (source.nodeName === "SCRIPT") continue;
      const id = key(source);
      let target = id ? [...current.childNodes].find((node) => key(node) === id) ?? null : cursor;
      if (!target || target.nodeType !== source.nodeType || target.nodeName !== source.nodeName || key(target) !== id) {
        target = doc.importNode(source, true);
        current.insertBefore(target, cursor);
      } else {
        if (target !== cursor) current.insertBefore(target, cursor);
        if (target.nodeType === 1) {
          attrs(target as Element, source as Element);
          children(target, source);
        } else if (target.nodeValue !== source.nodeValue) target.nodeValue = source.nodeValue;
      }
      cursor = target.nextSibling;
    }
    while (cursor) {
      const nextSibling = cursor.nextSibling;
      current.removeChild(cursor);
      cursor = nextSibling;
    }
  }
  attrs(doc.documentElement, next.documentElement);
  attrs(doc.body, next.body);
  children(doc.body, next.body);
  // Responsive and theme rules can change; external font links stay loaded.
  const styles = [...doc.head.querySelectorAll("style")];
  [...next.head.querySelectorAll("style")].forEach((style, index) => {
    if (styles[index]) {
      if (styles[index].textContent !== style.textContent) styles[index].textContent = style.textContent;
    } else doc.head.appendChild(doc.importNode(style, true));
  });
  for (const style of styles.slice(next.head.querySelectorAll("style").length)) style.remove();
  doc.title = next.title;
  doc.querySelectorAll("[data-lunia-block]").forEach((row) => row.setAttribute("draggable", "true"));
  doc.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((link) => {
    if (link.getAttribute("href") !== "#") link.title = `${link.href}  (⌘/Ctrl-click to open)`;
  });
}
