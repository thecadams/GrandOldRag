import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
    fontFamily: {
      'body': ['Dosis', 'sans-serif'],
    }
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
} satisfies Config;
