// Adds a "copy" button to each <pre> in blog post prose. Vanilla DOM; the
// Base.astro ascii-bg island is the pattern to follow for astro:page-load
// wiring so client-side routing doesn't leave stale buttons behind.

function attachCopyButtons(): void {
  const pres = document.querySelectorAll<HTMLPreElement>('.prose pre');
  pres.forEach(pre => {
    if (pre.dataset.copyReady === '1') return;
    pre.dataset.copyReady = '1';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'code-copy-btn';
    button.setAttribute('aria-label', 'Copy code to clipboard');
    button.textContent = 'copy';

    button.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent ?? pre.textContent ?? '';
      try {
        await navigator.clipboard.writeText(code);
        button.textContent = 'copied';
        button.classList.add('is-copied');
      } catch (_) {
        button.textContent = 'error';
      }
      window.setTimeout(() => {
        button.textContent = 'copy';
        button.classList.remove('is-copied');
      }, 1500);
    });

    pre.appendChild(button);
  });
}

if (typeof document !== 'undefined') {
  document.addEventListener('astro:page-load', attachCopyButtons);
}
