"use client";

import { formatIndianCurrency, formatWhatsAppPhone, formatDateDDMMYYYY } from "./calculations";
import React from "react";
import type { DedicatedInvoiceData } from "@/components/invoice/DedicatedInvoicePdfTemplate";

export { formatDateDDMMYYYY };

export interface BillPdfData {
  id?: string;
  kind: "purchase" | "sale";
  billNo: string;
  billDate: string; // YYYY-MM-DD
  partyName: string;
  partyPhone?: string | null;
  partyVillage?: string | null;
  hamali?: string | number;
  paidNow?: string | number;
  netPayable?: number;
  totalAmount?: number;
  totalPaid?: number;
  balanceDue?: string | number;
  items?: any[];
}



/**
 * Generate standardized filename: Bill-Kharedi-<Name>-<DD-MM-YYYY>.pdf
 */
export function getBillPdfFileName(bill: {
  kind: "purchase" | "sale";
  billNo: string;
  billDate: string;
  partyName: string;
}): string {
  const prefix = bill.kind === "purchase" ? "Kharedi" : "Vikri";
  const cleanName = (bill.partyName || "Party")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\u0900-\u097F_-]/g, "");
  const formattedDate = formatDateDDMMYYYY(bill.billDate);
  return `Bill-${prefix}-${cleanName}-${formattedDate}.pdf`;
}

/**
 * Wait for web fonts (Noto Sans Devanagari) to be fully ready
 */
async function waitForFonts() {
  if (typeof document !== "undefined" && document.fonts) {
    try {
      await document.fonts.ready;
    } catch {
      // Fallback
    }
  }
}

/**
 * Single centralized function to generate A4 PDF returning Blob, filename, and jsPDF instance.
 * Accepts either a bill UUID string or a full bill object.
 */
export async function generateInvoicePdf(
  billInput: string | DedicatedInvoiceData | any
): Promise<{ blob: Blob; fileName: string; pdf: any }> {
  let billData: DedicatedInvoiceData;

  if (typeof billInput === "string") {
    const { getBillByIdAction } = await import("@/app/actions/bills.actions");
    const fetched = await getBillByIdAction(billInput);
    if (!fetched) {
      throw new Error("Bill not found for PDF generation.");
    }
    billData = fetched as any;
  } else {
    billData = billInput;
  }

  await waitForFonts();

  // Create an off-screen container with fixed A4 width (794px)
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.width = "794px";
  container.style.backgroundColor = "#ffffff";
  container.style.zIndex = "-9999";
  document.body.appendChild(container);

  const { createRoot } = await import("react-dom/client");
  const { DedicatedInvoicePdfTemplate } = await import(
    "@/components/invoice/DedicatedInvoicePdfTemplate"
  );

  const root = createRoot(container);

  // Render dedicated template inside the offscreen container using React.createElement
  await new Promise<void>((resolve) => {
    root.render(
      React.createElement(
        React.StrictMode,
        null,
        React.createElement(DedicatedInvoicePdfTemplate, { bill: billData })
      )
    );
    // Allow React to commit DOM
    setTimeout(resolve, 80);
  });

  const invoiceEl = container.firstElementChild as HTMLElement;
  if (!invoiceEl) {
    root.unmount();
    document.body.removeChild(container);
    throw new Error("Failed to render invoice template element.");
  }

  // Dynamically import html2canvas-pro and jsPDF
  const html2canvasPro = (await import("html2canvas-pro")).default;
  const { jsPDF } = await import("jspdf");

  const canvas = await html2canvasPro(invoiceEl, {
    scale: 3, // High-resolution crisp rendering
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  // Cleanup off-screen container
  root.unmount();
  document.body.removeChild(container);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const fileName = getBillPdfFileName(billData);
  const isPur = billData.kind === "purchase";

  pdf.setProperties({
    title: `चव्हाण ट्रेडर्स बिल - ${billData.billNo}`,
    subject: `${isPur ? "खरेदी बिल" : "विक्री बिल"} - Chavan Traders`,
    author: "Chavan Traders, Uttur",
    creator: "Chavan Traders Mandi System",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 8;
  const maxContentWidth = pageWidth - margin * 2; // 194 mm
  const maxContentHeight = pageHeight - margin * 2; // 281 mm

  const contentWidth = maxContentWidth;
  const contentHeight = (canvas.height * contentWidth) / canvas.width;

  // Single page if it fits cleanly within A4 height
  if (contentHeight <= maxContentHeight) {
    const xPos = (pageWidth - contentWidth) / 2;
    const yPos = margin;
    const imgData = canvas.toDataURL("image/jpeg", 0.95);
    pdf.addImage(imgData, "JPEG", xPos, yPos, contentWidth, contentHeight, undefined, "FAST");
  } else {
    // Multi-page clean slicing (never cut mid-row)
    const pageCanvasHeight = (canvas.width * maxContentHeight) / contentWidth;
    let renderedHeight = 0;
    let pageNum = 0;

    while (renderedHeight < canvas.height) {
      if (pageNum > 0) {
        pdf.addPage();
      }

      const sliceHeight = Math.min(pageCanvasHeight, canvas.height - renderedHeight);
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeight;

      const ctx = sliceCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          canvas.width,
          sliceHeight,
          0,
          0,
          sliceCanvas.width,
          sliceHeight
        );
      }

      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
      const sliceHeightMm = (sliceHeight * contentWidth) / canvas.width;
      const xPos = (pageWidth - contentWidth) / 2;

      pdf.addImage(sliceData, "JPEG", xPos, margin, contentWidth, sliceHeightMm, undefined, "FAST");

      renderedHeight += pageCanvasHeight;
      pageNum++;
    }
  }

  const blob = pdf.output("blob");
  return { blob, fileName, pdf };
}

/**
 * Downloads bill PDF reliably across Chrome, Edge, Firefox, Android, iOS Safari
 */
export async function downloadBillPdf(
  billInput: string | DedicatedInvoiceData | any
): Promise<string> {
  const { pdf, fileName, blob } = await generateInvoicePdf(billInput);

  try {
    pdf.save(fileName);
  } catch {
    // Fallback for strict mobile webviews
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  return fileName;
}

/**
 * Formats short Marathi message with secure share link
 */
export function getShortWhatsAppMessage(
  bill: {
    kind: "purchase" | "sale";
    billNo: string;
    billDate: string;
    partyName: string;
    partyVillage?: string | null;
    totalAmount?: string | number;
    netPayable?: number;
    balanceDue?: string | number;
  },
  shareUrl?: string
): string {
  const isPur = bill.kind === "purchase";
  const dateFormatted = formatDateDDMMYYYY(bill.billDate);
  const location = bill.partyVillage ? ` (${bill.partyVillage})` : "";
  const netDue = Number(bill.balanceDue ?? 0);
  const total = Number(bill.netPayable ?? bill.totalAmount ?? 0);

  let msg =
    `🌾 *चव्हाण ट्रेडर्स | CHAVAN TRADERS*\n` +
    `कै. श्री. रमेश कृष्णा चव्हाण, उत्तूर\n` +
    `${isPur ? "खरेदी पावती" : "विक्री बिल"} [${bill.billNo}] • ${dateFormatted}\n` +
    `पार्टी: *${bill.partyName}*${location}\n` +
    (total ? `एकूण रक्कम: ₹${formatIndianCurrency(total)}\n` : "") +
    `बाकी रक्कम: *₹${formatIndianCurrency(netDue)}*\n`;

  if (shareUrl) {
    msg += `\nऑनलाइन बिल पाहा / डाउनलोड करा:\n${shareUrl}\n`;
  }

  msg += `\n📞 9765941078 / 9850815527`;
  return msg;
}

/**
 * Single unified WhatsApp workflow:
 * 1. Generates PDF with generateInvoicePdf
 * 2. Fetches public secure token from bill_shares
 * 3. Mobile / Share Sheet: navigator.share({ files: [pdfFile], text })
 * 4. Desktop: download PDF automatically + open https://wa.me/91<mobile>?text=...
 * 5. Works on EVERY bill even without a mobile number
 */
export async function shareBillOnWhatsApp(
  billInput: string | DedicatedInvoiceData | any,
  onNotify?: (mr: string, en: string) => void
) {
  let bill = billInput;
  if (typeof billInput === "string") {
    const { getBillByIdAction } = await import("@/app/actions/bills.actions");
    const fetched = await getBillByIdAction(billInput);
    if (!fetched) throw new Error("Bill not found.");
    bill = fetched;
  }

  let pdfBlob: Blob | null = null;
  let pdfFileName = getBillPdfFileName(bill);

  // 1. Generate PDF
  try {
    const res = await generateInvoicePdf(bill);
    pdfBlob = res.blob;
    pdfFileName = res.fileName;
  } catch (pdfErr) {
    console.error("PDF generation error in WhatsApp share:", pdfErr);
    onNotify?.(
      "PDF तयार करताना त्रुटी आली, तरी मेसेज पाठवला जात आहे.",
      "Could not generate PDF, sending WhatsApp message with bill link."
    );
  }

  // 2. Fetch or create public secure share link
  let shareUrl = "";
  try {
    if (bill.id) {
      const { getOrCreateBillShareAction } = await import(
        "@/app/actions/shares.actions"
      );
      const { token } = await getOrCreateBillShareAction(bill.id);
      if (typeof window !== "undefined") {
        shareUrl = `${window.location.origin}/b/${token}`;
      } else {
        shareUrl = `/b/${token}`;
      }
    }
  } catch (err) {
    console.error("Failed to generate share link:", err);
  }

  const shortMsg = getShortWhatsAppMessage(bill, shareUrl);
  const phone = bill.partyPhone ? formatWhatsAppPhone(bill.partyPhone) : "";
  const waUrl = phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(shortMsg)}`
    : `https://wa.me/?text=${encodeURIComponent(shortMsg)}`;

  // 3. Native Web Share with PDF File (Mobile / supported desktop)
  if (pdfBlob && typeof navigator !== "undefined" && navigator.canShare) {
    try {
      const pdfFile = new File([pdfBlob], pdfFileName, {
        type: "application/pdf",
      });

      if (navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title: `चव्हाण ट्रेडर्स बिल - ${bill.billNo}`,
          text: shortMsg,
          files: [pdfFile],
        });
        return;
      }
    } catch (shareErr: any) {
      // User cancelled share dialog -> handle silently
      if (shareErr?.name === "AbortError") {
        return;
      }
      console.warn("navigator.share failed, using desktop fallback:", shareErr);
    }
  }

  // 4. Desktop Fallback (e.g. Windows / Firefox)
  if (pdfBlob) {
    try {
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = pdfFileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch (e) {
      console.error("Download fallback error:", e);
    }
  }

  // Open WhatsApp in new tab
  if (typeof window !== "undefined") {
    window.open(waUrl, "_blank", "noopener,noreferrer");
  }

  onNotify?.(
    "PDF डाउनलोड झाला. WhatsApp मध्ये फाईल जोडा.",
    "PDF downloaded. Please attach it in WhatsApp."
  );
}
