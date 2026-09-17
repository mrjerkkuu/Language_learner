try {
  var t = localStorage.getItem('theme-v1')
  if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t
} catch (e) {}
