import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

import { tanstackStart } from "@tanstack/react-start/plugin/vite";

import tailwindcss from "@tailwindcss/vite";
import viteReact from "@vitejs/plugin-react";

const src = fileURLToPath(new URL("./src", import.meta.url));

const config = defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "~": src },
  },
  plugins: [tailwindcss(), tanstackStart(), viteReact()],
});

export default config;
