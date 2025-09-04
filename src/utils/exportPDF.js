// src/utils/exportPdf.js
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * 把一个 DOM 节点导出成 A4 PDF（避免文字被裁半）
 * @param {HTMLElement} node
 * @param {string} filename
 * @param {{ ignoreCssColors?: boolean, scale?: number }} options
 */
export async function exportNodeToPdf(
  node,
  filename = "SkillGap.pdf",
  { ignoreCssColors = true, scale = 2 } = {}
) {
  if (!node) throw new Error("exportNodeToPdf: node is null");

  // 不使用 try/catch：直接等待字体就绪
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }

  const canvas = await html2canvas(node, {
    scale,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
    letterRendering: true,

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

  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidthPt = pdf.internal.pageSize.getWidth();
  const pageHeightPt = pdf.internal.pageSize.getHeight();

  const imgWidthPt = pageWidthPt;
  const pxPerPt = canvas.width / imgWidthPt;
  const pageHeightPx = Math.floor(pageHeightPt * pxPerPt);

  const SAFETY = 2;

  let renderedPx = 0;
  const totalHeight = canvas.height;

  while (renderedPx < totalHeight) {
    const sliceHeightPx = Math.min(pageHeightPx - SAFETY, totalHeight - renderedPx);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = sliceHeightPx;

    const ctx = sliceCanvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;

    ctx.drawImage(
      canvas,
      0, renderedPx, canvas.width, sliceHeightPx,
      0, 0, sliceCanvas.width, sliceCanvas.height
    );

    const sliceImgData = sliceCanvas.toDataURL("image/png");
    const sliceHeightPt = sliceHeightPx / pxPerPt;

    if (renderedPx > 0) pdf.addPage();
    pdf.addImage(sliceImgData, "PNG", 0, 0, pageWidthPt, sliceHeightPt, undefined, "FAST");

    renderedPx += sliceHeightPx;
  }

  pdf.save(filename);
}
