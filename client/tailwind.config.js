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
      },
      animation: {
        drive: "drive 2.6s linear infinite",
        slide: "slide 1.3s ease-in-out infinite",
        "fade-up": "fade-up 0.3s ease-out both",
        "fade-in": "fade-in 0.2s ease-out both",
      },
    },
  },
  plugins: [require('tailwind-scrollbar-hide')],
}