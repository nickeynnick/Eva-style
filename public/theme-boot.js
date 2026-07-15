try {
  if (localStorage.getItem("eva_style_theme") === "dark") {
    document.documentElement.classList.add("dark");
    document.documentElement.style.colorScheme = "dark";
  } else {
    document.documentElement.style.colorScheme = "light";
  }
} catch (e) {
  /* ignore */
}

try {
  var zoom = Number(localStorage.getItem("eva_style_ui_zoom"));
  if (zoom === 0.85 || zoom === 1.1 || zoom === 1.25 || zoom === 1.5) {
    document.documentElement.style.zoom = String(zoom);
  }
} catch (e) {
  /* ignore */
}
