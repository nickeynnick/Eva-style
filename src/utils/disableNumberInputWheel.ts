/**
 * Браузер крутит value у input[type=number] при wheel — мешает прокрутке страницы.
 * Блокируем изменение значения и передаём прокрутку ближайшему скролл-контейнеру.
 */
function findScrollParent(start: Element | null): Element {
  let node: Element | null = start;
  while (node && node !== document.documentElement) {
    const style = window.getComputedStyle(node);
    const overflowY = style.overflowY;
    const canScroll =
      (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
      node.scrollHeight > node.clientHeight;
    if (canScroll) return node;
    node = node.parentElement;
  }
  return document.scrollingElement ?? document.documentElement;
}

export function installDisableNumberInputWheel(): void {
  document.addEventListener(
    "wheel",
    (event) => {
      const target = event.target;
      if (!(target instanceof HTMLInputElement) || target.type !== "number") return;

      target.blur();
      event.preventDefault();

      const scroller = findScrollParent(target.parentElement);
      scroller.scrollTop += event.deltaY;
    },
    { passive: false, capture: true }
  );
}
