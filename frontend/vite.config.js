// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import purgeCss from "vite-plugin-purgecss";

export default defineConfig(({ mode }) => {
  const isProd = mode === "production";

  return {
    plugins: [
      react(),
      //  PurgeCSS in production
      ...(isProd
        ? [
            {
              ...purgeCss({
                content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx,html}"],
                safelist: [
                  /dark/,     // matches: dark, dark-mode, is-dark, etc.
                  /active/,   // matches: active, is-active, btn-active, etc.
                  /open/,     // matches: open, menu-open, modal-open, etc.
                  "modal-open",
                  /^ant-/,    // Ant Design dynamic classes
                ],
              }),
              apply: "build",
            },
          ]
        : []),
    ],

    build: {
      sourcemap: false,
      minify: "esbuild",
      target: "es2019",
      reportCompressedSize: false,
    },
  };
});
