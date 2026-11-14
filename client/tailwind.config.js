/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
      },
      // Loading animations: the truck on the road, and the thin bar at the top
      keyframes: {
        drive: {
          "0%": { left: "-12%" },
          "100%": { left: "100%" },
        },
        slide: {
          "0%": { transform: "translateX(-100%)" },
          "100%": { transform: "translateX(300%)" },
        },
        // A card or window gently rising into place
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        // The tick after Save: pops in with a little bounce
        pop: {
          "0%": { transform: "scale(0.3)", opacity: "0" },
          "60%": { transform: "scale(1.2)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        // An order that was just changed lights up and fades back
        "flash-cell": {
          "0%": { backgroundColor: "rgba(249, 115, 22, 0.32)" },
          "100%": { backgroundColor: "rgba(249, 115, 22, 0)" },
        },
        "flash-ring": {
          "0%": { boxShadow: "0 0 0 4px rgba(249, 115, 22, 0.7)" },
          "100%": { boxShadow: "0 0 0 4px rgba(249, 115, 22, 0)" },
        },
      },
      animation: {
        drive: "drive 2.6s linear infinite",
        slide: "slide 1.3s ease-in-out infinite",
        "fade-up": "fade-up 0.3s ease-out backwards",
        "fade-in": "fade-in 0.2s ease-out backwards",
        pop: "pop 0.35s ease-out backwards",
        "flash-cell": "flash-cell 1.4s ease-out",
        "flash-ring": "flash-ring 1.4s ease-out",
      },
    },
  },
  plugins: [require('tailwind-scrollbar-hide')],
}