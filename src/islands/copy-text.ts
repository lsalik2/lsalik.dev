// [copy] buttons: copy the button's data-copy text. Where the clipboard is
// refused (no permission, older app views), select the visible text in the
// same group instead, so the visitor can copy it themselves. Buttons are
// hidden until this runs, so without JavaScript there's no dead button.

function selectText(el: Element): void {
  const range = document.createRange();
  range.selectNodeContents(el);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

function init(): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>('button[data-copy]')) {
    if (button.dataset.copyBound) continue;
    button.dataset.copyBound = 'true';
    button.hidden = false;
    const label = button.textContent ?? '';
    const target = button.parentElement?.querySelector('[data-copy-text]');
    const fallback = () => {
      if (target) selectText(target);
    };
    button.addEventListener('click', () => {
      const text = button.dataset.copy ?? '';
      if (!navigator.clipboard?.writeText) {
        fallback();
        return;
      }
      navigator.clipboard.writeText(text).then(() => {
        button.textContent = '[copied]';
        window.setTimeout(() => {
          button.textContent = label;
        }, 1500);
      }, fallback);
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', init);
}
