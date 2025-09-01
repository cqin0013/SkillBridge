// src/utils/exportPdf.js
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * 把一个 DOM 节点导出成 A4 PDF
 * @param {HTMLElement} node 需要导出的节点
 * @param {string} filename 导出文件名（默认 SkillGap.pdf）
 */
export async function exportNodeToPdf(node, filename = "SkillGap.pdf") {
  if (!node) throw new Error("exportNodeToPdf: node is null");

  // 用较高的 scale 提升清晰度
  const canvas = await html2canvas(node, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    windowWidth: node.scrollWidth,
  });

  const imgData = canvas.toDataURL("image/png");

  // A4 尺寸（pt）：210 × 297 mm ≈ 595 × 842 pt（72dpi）
  const pdf = new jsPDF("p", "pt", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // 根据宽度按比例缩放图片
  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  // 首页
  pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
  heightLeft -= pageHeight;

  // 如果超出一页，继续分页
  while (heightLeft > 0) {
    position = heightLeft - imgHeight; // 向上移动
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight, undefined, "FAST");
    heightLeft -= pageHeight;
  }

  pdf.save(filename);
}
