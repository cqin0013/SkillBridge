// vite.config.js
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import purgeCss from "vite-plugin-purgecss";
// Optional: analyze bundle size after build
// import { visualizer } from "rollup-plugin-visualizer";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),

    // PurgeCSS only in build to avoid removing dynamic classes during dev
    {
      ...purgeCss({
        content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx,html}"],
        safelist: [
          // Your dynamic class names (regex or strings)
          /^(dark|active|open)$/,
          "modal-open",

          // Important: keep Ant Design class prefix
          /^ant-/,
        ],
      }),
      apply: "build",
    },

    // Optional: visualize build output
    // visualizer({ open: true }),
  ],

  // Dev speed-up: avoid scanning the whole @ant-design/icons package
  // optimizeDeps: {
  //   exclude: ["@ant-design/icons", "@ant-design/icons-svg"],
  //   include: [
  //     // List only the deep-imported icons you actually use
  //     "@ant-design/icons/es/icons/QuestionCircleOutlined",
  //     "@ant-design/icons/es/icons/InfoCircleOutlined",
  //     "@ant-design/icons/es/icons/CheckCircleTwoTone",
  //     "@ant-design/icons/es/icons/CheckCircleFilled",
  //   ],
  // },

  build: {
    sourcemap: false,        // turn off sourcemaps for faster builds
    minify: "esbuild",       // fastest minifier
    target: "es2019",
    reportCompressedSize: false,
    // rollupOptions: { treeshake: true },
    // chunkSizeWarningLimit: 1200,
  },

  // server: {
  //   proxy: {
  //     "/api": {
  //       target: "https://skillbridge-hnxm.onrender.com",
  //       changeOrigin: true,
  //       secure: true,
  //       rewrite: (p) => p.replace(/^\/api/, ""),
  //     },
  //   },
  //   // Optional dev tweaks:
  //   // strictPort: true, // avoid slow retries if port is taken
  //   // hmr: { overlay: true },
  // },
}));
