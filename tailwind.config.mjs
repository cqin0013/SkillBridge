/** @type {import('tailwindcss').Config} */
// Tailwind v4 config.
// Notes:
// - Uses "Source Sans 3" as the primary font (loaded in index.html).
// - Extends brand tokens (colors, shadows, radii) and centers container.


export default {
  // Purge/scan sources for class names.
  // If you add new surfaces (stories, MDX, docs), include them here
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
    // Global container behavior:
    // Center the page content and apply a base gutter.
    container: {
      center: true,
      padding: "1rem",
    },

    extend: {
      // Brand colors (semantic tokens).
      // Usage:
      // - primary: brand accents (links, primary buttons).
      // - accent: secondary emphasis (badges, secondary buttons). Prefer BLACK text on accent for AAA.
      // - ink: body/secondary/inverted text tokens.
      // - border: hairlines/dividers only (too low contrast for text).
      colors: {
        primary: "#637DAB",      
        accent:  "#DE9526",      
  
        ink: {
          DEFAULT: "#0f172a",    
          soft:    "#475569",    
          invert:  "#ffffff",   
        },
        border: "#e2e8f0",       // hairline/dividers; not for text
      },

      // Typography stacks
      // Note: "Source Sans 3" must be loaded (self-host or CDN). If it fails, fallbacks apply.
      fontFamily: {
        // Body copy & general UI.
        sans: [
          "Source Sans 3",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
          "Apple Color Emoji",
          "Segoe UI Emoji",
        ],

        // Headings share the same family to keep rhythm consistent.
        heading: [
          "Source Sans 3",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],

        // Monospace for code/metrics/tabular alignment.
        mono: [
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace",
        ],
      },

      // Elevation system (cards/modals/glow).
      // Keep shadows subtle; avoid glow on body text blocks.
      boxShadow: {
        card:        "0 4px 12px rgba(0,0,0,0.08)",   
        modal:       "0 12px 32px rgba(0,0,0,0.14)",  
        "brand-glow":"0 0 16px rgba(30,58,138,0.45)", 
      },

      // Border radii tuned for a softer aesthetic.
      borderRadius: {
        lg:  "12px",
        xl:  "16px",
        "2xl":"20px",
      },
    },

  },

  // No extra plugins for now. 
  plugins: [],
};
