
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Export a DOM node to an A4 PDF (handles long content and prevents text cutoff).
 *
 * @param {HTMLElement} node - The DOM element to capture.
 * @param {string} filename - The output PDF file name (e.g. "report.pdf").
 * @param {{ ignoreCssColors?: boolean, scale?: number }} options
 *   - ignoreCssColors: if true, force black/white output (better for printing).
 *   - scale: render scale for html2canvas, higher = sharper PDF but larger file.
 */
export async function exportNodeToPdf(
  node,
  filename,
  { ignoreCssColors = true, scale = 2 } = {}
) {
  if (!node) throw new Error("exportNodeToPdf: node is null");
  if (!filename) throw new Error("exportNodeToPdf: filename is required");

  // Wait until all fonts are fully loaded (to avoid fallback fonts in output)
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  // Render the DOM node to canvas
  const canvas = await html2canvas(node, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
    letterRendering: true,

    // Modify cloned document styles if ignoring CSS colors (force black & white)
    onclone: (clonedDoc) => {
      if (!ignoreCssColors) return;
      const style = clonedDoc.createElement("style");
      style.setAttribute("data-export-pdf-color-override", "true");
      style.textContent = `
        *, *::before, *::after {
          color: #000 !important;
          background: transparent !important;
          background-image: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }
        svg [fill] { fill: #000 !important; }
        svg [stroke] { stroke: #000 !important; }
        table, th, td, .ant-card, .ant-tag, .ant-badge, .ant-alert {
          border-color: #000 !important;
        }
        .ant-tag, .ant-badge, .tag, .badge {
          border: 1px solid #000 !important;
        }
        a, a * { color: #000 !important; }
      `;
      clonedDoc.head.appendChild(style);
    },
  });

  // Initialize PDF (A4 size, portrait orientation, pt units)
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();

  // Calculate scaling between canvas px and PDF pt
  const imgWidthPt = pageWidthPt;
  const pxPerPt = canvas.width / imgWidthPt;
  const pageHeightPx = Math.floor(pageHeightPt * pxPerPt);

  const SAFETY = 2; // safety margin to avoid cutoff at page edges

  let renderedPx = 0;
  const totalHeight = canvas.height;

  // Slice the canvas into multiple pages if content is taller than one page
  while (renderedPx < totalHeight) {
    const sliceHeightPx = Math.min(
      pageHeightPx - SAFETY,
      totalHeight - renderedPx
    );

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;

    const ctx = sliceCanvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;

    ctx.drawImage(
      canvas,
      0,
      renderedPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      sliceCanvas.width,
      sliceCanvas.height
    );

    const sliceImgData = sliceCanvas.toDataURL("image/png");
    const sliceHeightPt = sliceHeightPx / pxPerPt;

    if (renderedPx > 0) pdf.addPage();
    pdf.addImage(
      sliceImgData,
      "PNG",
      0,
      0,
      pageWidthPt,
      sliceHeightPt,
      undefined,
      "FAST"
    );

    renderedPx += sliceHeightPx;
  }

  // Save PDF with the caller-provided filename
  pdf.save(filename);
}
