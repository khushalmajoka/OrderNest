// Slip picture (canvas) -> one-page PDF, 105 mm wide (A6). The page grows
// taller than A6 if a long address needs it. jsPDF is loaded only when a
// slip is actually made, so it does not slow down the rest of the app.
const PAGE_WIDTH_MM = 105;
const MIN_PAGE_HEIGHT_MM = 148;

export const slipToPdf = async (canvas) => {
  const { jsPDF } = await import("jspdf");
  const imageHeight = (PAGE_WIDTH_MM * canvas.height) / canvas.width;
  const pdf = new jsPDF({
    unit: "mm",
    format: [PAGE_WIDTH_MM, Math.max(MIN_PAGE_HEIGHT_MM, imageHeight)],
  });
  pdf.addImage(
    canvas.toDataURL("image/jpeg", 0.95),
    "JPEG",
    0,
    0,
    PAGE_WIDTH_MM,
    imageHeight
  );
  return pdf;
};
