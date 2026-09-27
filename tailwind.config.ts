import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        navy: "#1B2A41",
        blue: {
          DEFAULT: "#2E6FBA",
          50: "#EEF4FC",
          100: "#DCE8F7",
          500: "#2E6FBA",
          600: "#245A99",
          700: "#1A4273",
        },
        teal: {
          DEFAULT: "#1C9C8C",
          50: "#E8F5F4",
          100: "#D1EBE8",
          500: "#1C9C8C",
          600: "#168073",
        },
        amber: {
          DEFAULT: "#E8A33D",
          50: "#FDF6EC",
          100: "#FBEBD9",
          500: "#E8A33D",
          600: "#C2852A",
        },
        red: {
          DEFAULT: "#C8453B",
          50: "#FBF0EF",
          100: "#F7DFDD",
          500: "#C8453B",
          600: "#A6352C",
        },
        grey: {
          DEFAULT: "#8A94A6",
          50: "#F7F8FA",
          100: "#EDEFF2",
          200: "#DFE2E8",
          400: "#8A94A6",
          600: "#5D6574",
        },
        light: "#E9EEF5",
        
        // Semantic aliases
        siaga: "#C8453B",
        waspada: "#E8A33D",
        normal: "#8A94A6",
        
        // Typology
        typo: {
          kilat: "#7B61FF",
          airtanah: "#2E6FBA",
          irigasi: "#A0652A",
          campuran: "#1C9C8C",
        },

        // shadcn standard compatibility
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
      },
      fontFamily: {
        sans: ["var(--font-opensans)", "system-ui", "sans-serif"],
        heading: ["var(--font-nunito)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
