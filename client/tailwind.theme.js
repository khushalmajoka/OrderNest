// The colours of the three themes, in one place.
//
// The screens keep using normal Tailwind classes (bg-white, text-gray-800,
// border-stone-200, bg-green-100 ...). Backgrounds, text and borders read their
// colour from a CSS variable, and each theme only changes the variables:
//   (default) calm     the quiet grey look
//   classic            the warm orange look
//   dark               dark mode
// Things that are printed or sent to customers (delivery slip, share picture)
// carry the class "theme-light" and always stay light.
const plugin = require("tailwindcss/plugin");
const colors = require("tailwindcss/colors");

const channels = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)).join(" ");
};

const TINTS = ["orange", "red", "green", "amber", "yellow", "blue", "purple", "pink", "teal"];
const NEUTRAL = [50, 100, 200, 300];
const TEXT = [500, 600, 700, 800, 900];

// name of a variable -> colour, for the calm (default) theme
const light = {};
// ...and only what is different in the other themes
const dark = {};
const classic = {};
// which Tailwind classes read which variable
const bg = { white: "bg-white" };
const text = { black: "tx-black" };
const border = { white: "bd-white" };

light["bg-white"] = "#ffffff";
light["bd-white"] = "#ffffff";
light["tx-black"] = "#000000";
dark["bg-white"] = "#1f1d1b";
dark["bd-white"] = "#1f1d1b";
dark["tx-black"] = "#fafaf9";

// one colour family for one kind of property (bg, tx or bd)
const family = (target, prefix, color, shades) => {
  target[color] = {};
  for (const shade of shades) {
    const name = `${prefix}-${color}-${shade}`;
    light[name] = colors[color][shade];
    target[color][shade] = name;
  }
};

for (const c of ["gray", "stone"]) {
  family(bg, "bg", c, NEUTRAL);
  family(text, "tx", c, c === "gray" ? [300, ...TEXT] : TEXT);
  family(border, "bd", c, [...NEUTRAL, 400]);
}
for (const c of TINTS) {
  family(bg, "bg", c, [50, 100, 200]);
  family(text, "tx", c, [600, 700, 800, 900]);
  family(border, "bd", c, [100, 200, 300]);
}

// a soft mix of a strong colour into the dark surface (order rows must stay calm)
const mix = (a, b, share) => {
  const x = channels(a).split(" ").map(Number);
  const y = channels(b).split(" ").map(Number);
  return "#" + x.map((v, i) => Math.round(v * share + y[i] * (1 - share)).toString(16).padStart(2, "0")).join("");
};

/* ---------- dark ---------- */
const darkNeutral = {
  bg: { 50: "#151312", 100: "#2a2725", 200: "#383431", 300: "#57534e" },
  tx: { 300: "#57534e", 500: "#a8a29e", 600: "#c4bfba", 700: "#d6d3d1", 800: "#e7e5e4", 900: "#fafaf9" },
  bd: { 50: "#292624", 100: "#2e2b29", 200: "#3d3936", 300: "#57534e", 400: "#78716c" },
};
for (const c of ["gray", "stone"]) {
  for (const kind of ["bg", "tx", "bd"]) {
    for (const [shade, value] of Object.entries(darkNeutral[kind])) {
      if (light[`${kind}-${c}-${shade}`]) dark[`${kind}-${c}-${shade}`] = value;
    }
  }
}
for (const c of TINTS) {
  const t = colors[c];
  Object.assign(dark, {
    [`bg-${c}-50`]: mix(t[950], "#1f1d1b", 0.45),
    [`bg-${c}-100`]: mix(t[950], "#1f1d1b", 0.65),
    [`bg-${c}-200`]: t[900],
    [`tx-${c}-600`]: t[400],
    [`tx-${c}-700`]: t[400],
    [`tx-${c}-800`]: t[300],
    [`tx-${c}-900`]: t[100],
    [`bd-${c}-100`]: t[900],
    [`bd-${c}-200`]: t[800],
    [`bd-${c}-300`]: t[700],
  });
}

/* ---------- classic orange: the warm greys of the calm look become orange again ---------- */
const o = colors.orange;
Object.assign(classic, {
  "bg-stone-50": o[50],
  "bg-stone-100": o[100],
  "bg-stone-200": o[200],
  "bd-stone-200": o[200],
  "bd-stone-300": o[400],
  "tx-stone-500": o[700],
  "tx-stone-700": o[800],
  "tx-stone-800": o[700],
  "tx-stone-900": o[800],
});

const vars = (map) => Object.fromEntries(Object.entries(map).map(([k, v]) => [`--${k}`, channels(v)]));
const use = (tree) =>
  Object.fromEntries(
    Object.entries(tree).map(([color, v]) => [
      color,
      typeof v === "string"
        ? `rgb(var(--${v}) / <alpha-value>)`
        : Object.fromEntries(Object.entries(v).map(([shade, name]) => [shade, `rgb(var(--${name}) / <alpha-value>)`])),
    ])
  );

module.exports = {
  extend: {
    backgroundColor: use(bg),
    gradientColorStops: use(bg),
    textColor: use(text),
    borderColor: use(border),
  },
  plugin: plugin(({ addBase }) => {
    addBase({
      ":root, .theme-light": vars(light),
      'html[data-theme="classic"]': vars(classic),
      'html[data-theme="dark"]': vars(dark),
      // the slip and the share picture stay light even inside the dark theme
      'html[data-theme] .theme-light': vars(light),
    });
  }),
};
