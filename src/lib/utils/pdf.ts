// src/utils/pdf.ts
import { toPng } from "html-to-image";
import jsPDF from "jspdf";

/** Make and download a multi-page A4 PDF from a DOM node */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName = "SkillGap.pdf"
): Promise<void> {
  try {
    const dataUrl = await toPng(element, {
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: "#ffffff",
      skipFonts: true, // avoid CORS on Google Fonts
    });

    const img = new Image();
    img.src = dataUrl;
    // decode() is safer than onload/onerror and surfaces real errors
    await img.decode();

    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    const imgW = pageW;
    const imgH = (img.naturalHeight * imgW) / img.naturalWidth;

    let y = 0;
    pdf.addImage(dataUrl, "PNG", 0, y, imgW, imgH, undefined, "FAST");

    let remain = imgH - pageH;
    while (remain > 0) {
      pdf.addPage();
      y -= pageH;
      pdf.addImage(dataUrl, "PNG", 0, y, imgW, imgH, undefined, "FAST");
      remain -= pageH;
    }

    pdf.save(fileName);
  } catch (err) {
    console.error("[exportElementToPdf] failed:", err);
    throw err; // let caller decide fallback
  }
}
