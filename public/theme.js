// Applies the saved/preferred theme before React mounts to avoid a flash of
// unstyled content. Kept as an external (non-inline) script so the production
// CSP can use `script-src 'self'` without 'unsafe-inline'.
(function () {
  try {
    var stored = localStorage.getItem('theme')
    var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    if (stored === 'dark' || (!stored && prefersDark)) {
      document.documentElement.classList.add('dark')
    }
  } catch (_) {
    /* noop */
  }
})()
