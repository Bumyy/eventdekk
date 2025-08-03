import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

import path from "path";

// https://vitejs.dev/config/
// @ts-ignore
export default defineConfig(({ command, mode }) => {
  // Load env files based on mode
  // This ensures:
  // - In development (npm run dev): .env is used
  // - In production (npm run build): .env.production is used
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Define additional environment variables if needed
    define: {
      __APP_ENV__: JSON.stringify(env.APP_ENV || mode),
    },
    // Log to confirm which env file is being used
    build: {
      outDir: "dist",
      sourcemap: mode !== "production",
      rollupOptions: {
        onLog(level, log, handler) {
          if (level === "info" && log.message?.includes("created")) {
            console.log(`🚀 Building for ${mode} environment`);
          }
          handler(level, log);
        },
      },
    },
  };
});
