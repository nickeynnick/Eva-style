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
