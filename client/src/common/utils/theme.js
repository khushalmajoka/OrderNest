// The look each person chooses on their own phone or computer. It is kept in
// this browser only (not in the shop's data). The same short code runs in
// public/index.html before the app loads, so a page does not flash light first.
export const THEMES = [
  { id: "calm", label: "Calm", note: "Quiet grey and white, orange only on the main buttons.", bar: "#ffffff" },
  { id: "classic", label: "Classic orange", note: "The warm orange look.", bar: "#fff7ed" },
  { id: "dark", label: "Dark", note: "Dark background, easier on the eyes at night.", bar: "#1f1d1b" },
];

export const THEME_KEY = "theme";

export const getTheme = () => {
  try {
    const saved = localStorage.getItem(THEME_KEY);
    return THEMES.some((t) => t.id === saved) ? saved : "calm";
  } catch {
    return "calm";
  }
};

export const setTheme = (id) => {
  const theme = THEMES.find((t) => t.id === id) || THEMES[0];
  try {
    localStorage.setItem(THEME_KEY, theme.id);
  } catch {
    /* private window: the choice lasts until the page is closed */
  }
  document.documentElement.dataset.theme = theme.id;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme.bar);
};
