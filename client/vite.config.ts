import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import babel from "@rolldown/plugin-babel";
import path from "path";

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    tailwindcss(),
    // React Compiler — auto-memoizes components so re-renders in the POS cart
    // and large tables don't cascade.
    babel({ presets: [reactCompilerPreset()], sourceMap: false }),
  ],
  // React (and several other libraries) pick their build with
  // `process.env.NODE_ENV === "production"`. Without this define the check did
  // not fold at build time, so the DEVELOPMENT build of react-dom was being
  // shipped to production — twice the bytes and dramatically slower rendering,
  // because every render then runs dev-only validation and warning machinery.
  // Pinning it here means a production bundle no longer depends on whoever runs
  // the build happening to have NODE_ENV set.
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      command === "build" ? "production" : "development",
    ),
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Every browser this POS is used on supports these; shipping ES2022
    // avoids downlevelling async/await and class fields into larger code.
    target: "es2022",
    cssCodeSplit: true,
    sourcemap: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        // Split the rarely-changing vendor code out of the entry so a deploy
        // doesn't invalidate the framework bundle in everyone's cache, and so
        // the browser can parse these in parallel with the app shell.
        advancedChunks: {
          groups: [
            {
              name: "vendor-react",
              test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/,
              priority: 30,
            },
            {
              // Tiny styling helpers that almost every component uses. Without
              // an explicit high-priority group they get absorbed into
              // whichever vendor chunk claims them first — clsx landed inside
              // the charts chunk, which forced all 400 kB of recharts into the
              // entry's static import graph and undid the lazy loading.
              name: "vendor-shared",
              test: /node_modules[\\/](clsx|tailwind-merge|class-variance-authority)[\\/]/,
              priority: 40,
            },
            {
              name: "vendor-clerk",
              test: /node_modules[\\/]@clerk[\\/]/,
              priority: 20,
            },
            {
              // Deliberately narrow: pulling shared helpers (fast-equals,
              // decimal.js-light) in here dragged the whole chart chunk back
              // into the entry's static import graph.
              name: "vendor-charts",
              test: /node_modules[\\/](recharts|victory-vendor|d3-(?:array|scale|shape|path|time|time-format|format|interpolate|color|ease))[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
}));
