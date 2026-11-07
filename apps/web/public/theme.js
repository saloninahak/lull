// set the theme before first paint so there is no flash and no shift.
// a file of its own, not inline, so the page's security policy can stay strict.
(function () {
  var theme = 'light';
  try {
    if (localStorage.getItem('lull:theme') === 'dark') theme = 'dark';
  } catch {
    // private mode: light it is
  }
  document.documentElement.setAttribute('data-theme', theme);
  var meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#ffffff');
})();
