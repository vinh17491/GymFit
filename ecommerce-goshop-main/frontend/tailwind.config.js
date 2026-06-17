/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        container: {
            center: true
        },
        extend: {
            screens: {
                xs: "500px"
            },
            colors: {
                dark: {
                    DEFAULT: "#0A0A0A",
                    card: "#1A1A1A",
                    surface: "#2A2A2A",
                    border: "#333333",
                },
                cyan: {
                    DEFAULT: "#00FFD1",
                    50: "#E6FFF9",
                    100: "#B3FFED",
                    200: "#80FFE2",
                    300: "#4DFFD6",
                    400: "#1AFFCB",
                    500: "#00FFD1",
                    600: "#00CCA7",
                    700: "#00997D",
                    800: "#006654",
                    900: "#00332A",
                },
                secondary: "#64748B",
                primary: "#00FFD1",
            },
            fontFamily: {
                "display": ["Anton", "Bebas Neue", "sans-serif"],
                "sans": ["Inter", "sans-serif"],
            },
            letterSpacing: {
                wider: "0.05em",
                widest: "0.1em",
            },
            dropShadow: {
                "custom": "0px 1px 2px 0px rgba(51, 65, 86, 0.08)",
                "glow": "0 0 20px rgba(0, 255, 209, 0.3)",
            },
            backgroundImage: {
                "customGradient": "linear-gradient(180deg, rgba(255, 255, 255, 0.08) 16.33%, rgba(0, 0, 0, 0.40) 100%)",
                "auth": "url('/src/assets/images/Auth/auth-bg.webp')",
                "showcase": "url('/src/assets/images/Home/showcase.webp')",
                "newArrivals": "url('/src/assets/images/Home/new-arrivals-section.webp')",
                "discounts": "url('/src/assets/images/Home/discounts-section.webp')",
                "hero-gym": "linear-gradient(135deg, rgba(10,10,10,0.85) 0%, rgba(10,10,10,0.4) 100%), url('/src/assets/images/Home/hero-bg.webp')",
                "cta-gradient": "linear-gradient(135deg, #00FFD1 0%, #00CCA7 100%)",
            },
            backgroundColor: {
                "black-cover": "rgba(10, 10, 10, 0.65)",
                "main-gray": "#F9FAFB" 
            },
            boxShadow: {
                "blur": "0px 12px 16px -4px rgba(12, 26, 36, 0.04)",
                "neon": "0 0 15px rgba(0, 255, 209, 0.5)",
                "card": "0 4px 20px rgba(0, 0, 0, 0.3)",
            },
            keyframes: {
                "dropdownScale": {
                    "0%": { transform: "scale(0)" },
                    "100%": { transform: "scale(1)" }
                },
                "fadeIn": {
                    "0%": { opacity: 0.2 },
                    "25%": { opacity: 0.4 },
                    "50%": { opacity: 0.6 },
                    "75%": { opacity: 0.8 },
                    "100%": { opacity: 1.0 },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 5px rgba(0, 255, 209, 0.3)" },
                    "50%": { boxShadow: "0 0 20px rgba(0, 255, 209, 0.6)" },
                }
            },
            animation: {
                dropdown: "dropdownScale .2s",
                fadeIn: "fadeIn .2s ease-in-out",
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
            }
        },
    },
    plugins: [],
};