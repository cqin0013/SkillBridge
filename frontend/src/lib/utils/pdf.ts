// Generate and download a multi-page A4 PDF from a DOM element.
// Heavy deps (html-to-image, jspdf) are loaded on demand to keep initial bundle small.

export async function exportElementToPdf(
  element: HTMLElement,
  fileName = "SkillGap.pdf"
): Promise<void> {
  try {
    // Load heavy libraries only when needed (code-split chunk)
    const [{ toPng }, { default: jsPDF }] = await Promise.all([
      import("html-to-image"),
      import("jspdf"),
    ]);

    // Render the element to a PNG data URL
    const dataUrl = await toPng(element, {
      pixelRatio: 2,          // upscale for clearer print
      cacheBust: true,        // avoid cached canvas
      backgroundColor: "#ffffff",
      skipFonts: true,        // avoid CORS issues on web fonts
    });

    // Decode to get intrinsic size
    const img = new Image();
    img.src = dataUrl;
    await img.decode(); // safer than onload

    // Create A4 PDF in pt (1pt ≈ 1/72 inch)
    const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    // Fit image by width, preserve aspect ratio
    const imgW = pageW;
    const imgH = (img.naturalHeight * imgW) / img.naturalWidth;

    // Add first page
    let y = 0;
    pdf.addImage(dataUrl, "PNG", 0, y, imgW, imgH, undefined, "FAST");

    // If content is taller than one page, add more pages by shifting Y
    let remain = imgH - pageH;
    while (remain > 0) {
      pdf.addPage();
      y -= pageH; // move image up to reveal next slice
      pdf.addImage(dataUrl, "PNG", 0, y, imgW, imgH, undefined, "FAST");
      remain -= pageH;
    }

    pdf.save(fileName);
  } catch (err) {
    // English comments only in code as requested
    console.error("[exportElementToPdf] failed:", err);
    throw err; // let caller decide how to notify users
  }
}
