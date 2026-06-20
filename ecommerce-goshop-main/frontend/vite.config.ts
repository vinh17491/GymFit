import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
    root: __dirname,
    envDir: "../",
    appType: 'spa',
    server: {
        host: '0.0.0.0',
        port: 5115,
        strictPort: false,
    },
    build: {
        outDir: path.resolve(__dirname, "dist"),
    },
    plugins: [
        react(),
        VitePWA({
            registerType: "prompt",
            includeAssets: [
                "favicon.ico",
                "apple-touch-icon.png",
                "masked-icon.svg",
            ],
            manifest: {
                name: "GymFit",
                short_name: "GymFit",
                description: "Your fitness journey starts here",
                theme_color: "#fff",
                start_url: "/",
                icons: [
                    {
                        src: "pwa-192x192.png",
                        sizes: "192x192",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                    },
                    {
                        src: "pwa-512x512.png",
                        sizes: "512x512",
                        type: "image/png",
                        purpose: "any maskable",
                    },
                ],
            },
        }),
    ],
});