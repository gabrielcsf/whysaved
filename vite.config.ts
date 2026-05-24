import { crx } from "@crxjs/vite-plugin";
import react from "@vitejs/plugin-react";
import autoprefixer from "autoprefixer";
import tailwindcss from "tailwindcss";
import { defineConfig } from "vite";

import manifest from "./src/manifest";

export default defineConfig({
  plugins: [react(), crx({ manifest })],
  css: {
    postcss: {
      plugins: [tailwindcss(), autoprefixer()],
    },
  },
});
