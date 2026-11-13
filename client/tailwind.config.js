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
      },
      animation: {
        drive: "drive 2.6s linear infinite",
        slide: "slide 1.3s ease-in-out infinite",
      },
    },
  },
  plugins: [require('tailwind-scrollbar-hide')],
}