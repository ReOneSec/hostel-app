import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  buildAdmissionFormPDF,
  admissionFormFilename,
  type AdmissionFormAssets,
} from "./admission-form-pdf";

// Helper to format currency in INR style
function formatCurrency(val: any): string {
  const num = Number(val || 0);
  return `Rs. ${num.toLocaleString("en-IN")}`;
}

export function generateInvoicePDF(bill: any, userProfile?: any, saveToFile = true) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Design Tokens (Recommended Settings)
  const primaryNavy: [number, number, number] = [20, 45, 78]; // Navy #142D4E
  const accentTeal: [number, number, number] = [34, 166, 161]; // Teal #22A6A1
  const darkCharcoal: [number, number, number] = [33, 37, 41]; // Body text
  const slateGrey: [number, number, number] = [100, 116, 139]; // Secondary text
  const lightBg: [number, number, number] = [248, 250, 252]; // #F8FAFC
  const borderColor: [number, number, number] = [226, 232, 240]; // #E2E8F0

  const margin = 20; // 20mm margin (18–22 mm recommendation)
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2; // 170mm
  const rightX = pageWidth - margin; // 190mm

  // Top Accent Stripe (Brand Banner)
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, 140, 3.5, "F");
  doc.setFillColor(...accentTeal);
  doc.rect(140, 0, 70, 3.5, "F");

  // 1. BRAND HEADER
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...primaryNavy);
  doc.text("MIRROR HOSTELS", margin, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...slateGrey);
  doc.text("Hostel Fee Invoice", margin, 28);

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  let billingMonthText = "";
  if (bill.billType === "ESTABLISHMENT_FEE" || (bill.month === 0 && bill.year === 0)) {
    billingMonthText = "ONE-TIME ESTABLISHMENT FEE";
  } else if (bill.billType === "BED_FEE" || (bill.month === 0 && Number(bill.year) > 0)) {
    billingMonthText = `ANNUAL BED FEE (${bill.year})`;
  } else if (bill.month && bill.year) {
    billingMonthText = `${monthNames[bill.month - 1] || ""} ${bill.year}`.trim();
  }

  if (billingMonthText) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...accentTeal);
    doc.text(`BILLING CYCLE: ${billingMonthText.toUpperCase()}`, margin, 34);
  }

  // Right-aligned Invoice Meta Details
  const invoiceNo = (bill.id ? bill.id.slice(-8) : "INV001").toUpperCase();
  const generatedDateStr = bill.generatedAt || bill.createdAt
    ? format(new Date(bill.generatedAt || bill.createdAt), "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy");
  const dueDateStr = bill.dueDate
    ? format(new Date(bill.dueDate), "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text(`Invoice No: ${invoiceNo}`, rightX, 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  doc.text(`Date: ${generatedDateStr}`, rightX, 28, { align: "right" });
  doc.text(`Due Date: ${dueDateStr}`, rightX, 34, { align: "right" });

  // Divider Line with Teal Accent
  const lineY = 38;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(margin, lineY, rightX, lineY);

  doc.setDrawColor(...accentTeal);
  doc.setLineWidth(1.2);
  doc.line(margin, lineY, margin + 28, lineY);

  // 2. BILLED TO & HOSTEL INFO CARD
  const cardY = 44;
  const cardHeight = 28;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 2, 2, "FD");

  // Billed To Info (Left side of card)
  const studentName =
    userProfile?.fullName ||
    bill.user?.studentProfile?.fullName ||
    bill.user?.name ||
    bill.user?.username ||
    "Student";
  const studentEmail = bill.user?.email || userProfile?.email || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...accentTeal);
  doc.text("BILLED TO", margin + 6, cardY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkCharcoal);
  doc.text(studentName, margin + 6, cardY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  if (studentEmail) {
    doc.text(studentEmail, margin + 6, cardY + 19);
  }

  // Hostel & Property Info (Right side of card)
  const hostelName = bill.hostel?.name || "Mirror Hostels";
  const hostelX = margin + 95;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...accentTeal);
  doc.text("PROPERTY & ACCOMMODATION", hostelX, cardY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...darkCharcoal);
  doc.text(hostelName, hostelX, cardY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  const roomInfo = bill.room?.roomNumber
    ? `Room ${bill.room.roomNumber}${bill.bed?.bedLabel ? ` • Bed ${bill.bed.bedLabel}` : ""}`
    : "Standard Student Residence";
  doc.text(roomInfo, hostelX, cardY + 19);

  // 3. TABLE OF CHARGES
  const tableData: string[][] = [];
  if (bill.billType === "ESTABLISHMENT_FEE" || (bill.month === 0 && bill.year === 0)) {
    tableData.push(["Establishment Fee (One-Time Lifetime)", formatCurrency(bill.establishmentFee || bill.totalAmount)]);
  } else if (bill.billType === "BED_FEE" || (bill.month === 0 && Number(bill.year) > 0)) {
    tableData.push([`Annual Bed Fee (${bill.year})`, formatCurrency(bill.bedFee || bill.totalAmount)]);
  } else {
    tableData.push(["Room Rent", formatCurrency(bill.rentAmount)]);
    if (Number(bill.bedFee) > 0) {
      tableData.push(["Bed Fee", formatCurrency(bill.bedFee)]);
    }
    if (Number(bill.establishmentFee) > 0) {
      tableData.push(["Establishment Fee", formatCurrency(bill.establishmentFee)]);
    }
    if (Number(bill.messCharge) > 0) {
      tableData.push(["Mess Charge", formatCurrency(bill.messCharge)]);
    }
  }

  if (Number(bill.lateFee) > 0) {
    tableData.push(["Late Fee", formatCurrency(bill.lateFee)]);
  }

  autoTable(doc, {
    startY: 78,
    margin: { left: margin, right: margin },
    head: [["Description", "Amount"]],
    body: tableData,
    theme: "plain",
    headStyles: {
      fillColor: primaryNavy, // Navy #142D4E
      textColor: [255, 255, 255],
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
    },
    bodyStyles: {
      textColor: darkCharcoal,
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: lightBg,
    },
    columnStyles: {
      0: { cellWidth: 115 },
      1: { cellWidth: 55, halign: "right", fontStyle: "bold" },
    },
    foot: [["Total Amount", formatCurrency(bill.totalAmount)]],
    footStyles: {
      fillColor: lightBg,
      textColor: primaryNavy,
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
      lineColor: borderColor,
      lineWidth: 0.2,
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  // 4. TOTAL AMOUNT & PAYMENT & TRANSACTION DETAILS
  const summaryY = finalY + 8;
  const summaryHeight = 42;

  // Extract Payment Paid Date and UTR Number
  const verifiedPayment =
    bill.payments?.find((p: any) => p.status === "VERIFIED") ||
    bill.payments?.[0];

  const rawPaidDate =
    bill.paidDate ||
    bill.paymentDate ||
    bill.paidAt ||
    verifiedPayment?.paymentDate ||
    verifiedPayment?.verifiedAt ||
    (bill.status === "PAID" && bill.updatedAt ? bill.updatedAt : null);

  let paidDateDisplay = "Not Available";
  if (rawPaidDate) {
    try {
      const d = new Date(rawPaidDate);
      if (!isNaN(d.getTime())) {
        paidDateDisplay = format(d, "MMM d, yyyy");
      }
    } catch {
      paidDateDisplay = "Not Available";
    }
  }

  const rawUtr =
    bill.utrNumber ||
    bill.utr ||
    verifiedPayment?.utrNumber ||
    verifiedPayment?.transactionId ||
    bill.transactionId;

  const utrDisplay =
    rawUtr && String(rawUtr).trim().length > 0
      ? String(rawUtr).trim()
      : "Not Available";

  // Left card: Payment Status & Transaction Details
  const statusCardWidth = 84;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, summaryY, statusCardWidth, summaryHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGrey);
  doc.text("PAYMENT & TRANSACTION", margin + 6, summaryY + 7);

  // Status Badge Drawing
  const badgeX = margin + 6;
  const badgeY = summaryY + 10.5;
  const badgeWidth = 72;
  const badgeHeight = 7.5;
  const isPaid = bill.status === "PAID";
  const isPartial = bill.status === "PARTIALLY_PAID";
  const isOverdue = bill.status === "OVERDUE";

  let badgeBg: [number, number, number] = [236, 253, 245]; // Soft Emerald #ECFDF5
  let badgeBorder: [number, number, number] = [16, 185, 129]; // Emerald #10B981
  let badgeText: [number, number, number] = [4, 120, 87]; // Deep Emerald #047857
  let badgeLabel = `PAID (${formatCurrency(bill.paidAmount)})`;

  if (isPaid) {
    badgeBg = [236, 253, 245];
    badgeBorder = [16, 185, 129];
    badgeText = [4, 120, 87];
    badgeLabel = `PAID (${formatCurrency(bill.paidAmount)})`;
  } else if (isPartial) {
    badgeBg = [255, 251, 235];
    badgeBorder = [245, 158, 11];
    badgeText = [180, 83, 9];
    badgeLabel = `PARTIALLY PAID (${formatCurrency(bill.paidAmount)})`;
  } else if (isOverdue) {
    badgeBg = [254, 242, 242];
    badgeBorder = [239, 68, 68];
    badgeText = [185, 28, 28];
    badgeLabel = `OVERDUE`;
  } else {
    badgeBg = [241, 245, 249];
    badgeBorder = [148, 163, 184];
    badgeText = [51, 65, 85];
    badgeLabel = `UNPAID`;
  }

  doc.setFillColor(...badgeBg);
  doc.setDrawColor(...badgeBorder);
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...badgeText);
  doc.text(badgeLabel, badgeX + badgeWidth / 2, badgeY + 5, { align: "center" });

  // Payment Paid Date Row
  const row1Y = summaryY + 23.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text("Payment Paid:", margin + 6, row1Y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkCharcoal);
  doc.text(paidDateDisplay, margin + 31, row1Y);

  // UTR Number Row
  const row2Y = summaryY + 30;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text("UTR Number:", margin + 6, row2Y);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...darkCharcoal);
  doc.text(utrDisplay, margin + 31, row2Y);

  const totalNum = Number(bill.totalAmount || 0);
  const paidNum = Number(bill.paidAmount || 0);
  const pendingNum = Math.max(0, totalNum - paidNum);

  // Balance Note
  const row3Y = summaryY + 37;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGrey);
  if (isPaid) {
    doc.text("Paid in full • Zero balance remaining", margin + 6, row3Y);
  } else {
    doc.text(`Balance Due: ${formatCurrency(pendingNum)}`, margin + 6, row3Y);
  }

  // Right card: Total Amount (Bold & Visually Prominent)
  const totalCardX = margin + statusCardWidth + 6;
  const totalCardWidth = contentWidth - statusCardWidth - 6; // 80mm

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalCardX, summaryY, totalCardWidth, summaryHeight, 2, 2, "FD");

  // Teal left accent border on Total Card
  doc.setFillColor(...accentTeal);
  doc.rect(totalCardX, summaryY, 2.5, summaryHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accentTeal);
  doc.text("TOTAL AMOUNT", totalCardX + 8, summaryY + 8);

  // Bold, visually prominent Total Amount
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primaryNavy);
  doc.text(formatCurrency(bill.totalAmount), totalCardX + 8, summaryY + 20);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text(`Due by: ${dueDateStr}`, totalCardX + 8, summaryY + 28);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGrey);
  if (isPaid) {
    doc.text("Settled via Digital Records", totalCardX + 8, summaryY + 36);
  } else {
    doc.text("Pending Collection", totalCardX + 8, summaryY + 36);
  }

  // 5. THANK YOU & INQUIRIES
  const notesY = summaryY + summaryHeight + 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text("Thank you for choosing Mirror Hostels.", margin, notesY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  doc.text("For any billing inquiries, please contact your hostel administration office.", margin, notesY + 5.5);

  // 6. PAGE FOOTER
  const footerY = 280;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, rightX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text("Mirror Hostels • Student Housing & Living", margin, footerY + 6);
  doc.text("Computer Generated Invoice", pageWidth / 2, footerY + 6, { align: "center" });
  doc.text("support@mirrorhostels.com", rightX, footerY + 6, { align: "right" });

  // Save
  if (saveToFile) {
    try {
      doc.save(`Invoice_${invoiceNo}.pdf`);
    } catch {}
  }
  return doc;
}


export function generateReceiptPDF(payment: any) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Design Tokens
  const primaryNavy: [number, number, number] = [20, 45, 78]; // Navy #142D4E
  const accentTeal: [number, number, number] = [34, 166, 161]; // Teal #22A6A1
  const darkCharcoal: [number, number, number] = [33, 37, 41];
  const slateGrey: [number, number, number] = [100, 116, 139];
  const lightBg: [number, number, number] = [248, 250, 252];
  const borderColor: [number, number, number] = [226, 232, 240];

  const margin = 20; // 20mm margin
  const pageWidth = 210;
  const contentWidth = pageWidth - margin * 2;
  const rightX = pageWidth - margin;

  // Top Accent Stripe
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, 140, 3.5, "F");
  doc.setFillColor(...accentTeal);
  doc.rect(140, 0, 70, 3.5, "F");

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...primaryNavy);
  doc.text("MIRROR HOSTELS", margin, 22);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...slateGrey);
  doc.text("Official Payment Receipt", margin, 28);

  const receiptNo = (payment.id ? payment.id.slice(-8) : "REC001").toUpperCase();
  const paymentDateStr = payment.paymentDate || payment.verifiedAt || payment.submittedAt
    ? format(new Date(payment.paymentDate || payment.verifiedAt || payment.submittedAt), "MMM d, yyyy")
    : format(new Date(), "MMM d, yyyy");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text(`Receipt No: ${receiptNo}`, rightX, 22, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  doc.text(`Date: ${paymentDateStr}`, rightX, 28, { align: "right" });

  // Divider Line with Teal Accent
  const lineY = 36;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.4);
  doc.line(margin, lineY, rightX, lineY);

  doc.setDrawColor(...accentTeal);
  doc.setLineWidth(1.2);
  doc.line(margin, lineY, margin + 28, lineY);

  // Received From Card
  const cardY = 42;
  const cardHeight = 26;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cardY, contentWidth, cardHeight, 2, 2, "FD");

  const studentName =
    payment.user?.studentProfile?.fullName ||
    payment.user?.name ||
    payment.user?.username ||
    "Student";
  const studentEmail = payment.user?.email || "";

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...accentTeal);
  doc.text("RECEIVED FROM", margin + 6, cardY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...darkCharcoal);
  doc.text(studentName, margin + 6, cardY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  if (studentEmail) {
    doc.text(studentEmail, margin + 6, cardY + 19);
  }

  // Right side of card: Payment Mode & Verification
  const rightCardX = margin + 95;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...accentTeal);
  doc.text("TRANSACTION VERIFICATION", rightCardX, cardY + 7);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...darkCharcoal);
  doc.text(`Status: ${payment.status || "VERIFIED"}`, rightCardX, cardY + 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  doc.text(`Bill Ref: ${payment.billId ? payment.billId.slice(-8).toUpperCase() : "N/A"}`, rightCardX, cardY + 19);

  // Table of Payment Details
  autoTable(doc, {
    startY: 74,
    margin: { left: margin, right: margin },
    head: [["Transaction Detail", "Information"]],
    body: [
      ["Amount Paid", formatCurrency(payment.amount)],
      ["Payment Date", paymentDateStr],
      ["Transaction / Ref ID", payment.transactionId || "N/A"],
      ["UTR Number", payment.utrNumber || "N/A"],
      ["Associated Bill ID", payment.billId ? payment.billId.slice(-8).toUpperCase() : "N/A"],
    ],
    theme: "plain",
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      font: "helvetica",
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
    },
    bodyStyles: {
      textColor: darkCharcoal,
      font: "helvetica",
      fontSize: 9,
      cellPadding: { top: 3.5, bottom: 3.5, left: 6, right: 6 },
      lineColor: borderColor,
      lineWidth: 0.1,
    },
    alternateRowStyles: {
      fillColor: lightBg,
    },
    columnStyles: {
      0: { cellWidth: 80, fontStyle: "normal", textColor: slateGrey },
      1: { cellWidth: 90, fontStyle: "bold" },
    },
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 140;

  // Highlight Box: Amount Paid & Green Status Badge
  const summaryY = finalY + 8;
  const summaryHeight = 32;

  // Left: Green Status Badge
  const statusCardWidth = 78;
  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, summaryY, statusCardWidth, summaryHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...slateGrey);
  doc.text("PAYMENT STATUS", margin + 6, summaryY + 8);

  const badgeX = margin + 6;
  const badgeY = summaryY + 12;
  const badgeWidth = 66;
  const badgeHeight = 8;
  doc.setFillColor(236, 253, 245); // Soft Emerald
  doc.setDrawColor(16, 185, 129); // Emerald border
  doc.setLineWidth(0.3);
  doc.roundedRect(badgeX, badgeY, badgeWidth, badgeHeight, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(4, 120, 87); // Deep Emerald
  doc.text("SUCCESSFUL / VERIFIED", badgeX + badgeWidth / 2, badgeY + 5.2, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text("Direct payment recorded", margin + 6, summaryY + 26);

  // Right: Prominent Amount Paid
  const totalCardX = margin + statusCardWidth + 6;
  const totalCardWidth = contentWidth - statusCardWidth - 6;

  doc.setFillColor(...lightBg);
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(totalCardX, summaryY, totalCardWidth, summaryHeight, 2, 2, "FD");

  doc.setFillColor(...accentTeal);
  doc.rect(totalCardX, summaryY, 2.5, summaryHeight, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...accentTeal);
  doc.text("AMOUNT RECEIVED", totalCardX + 8, summaryY + 8);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primaryNavy);
  doc.text(formatCurrency(payment.amount), totalCardX + 8, summaryY + 19);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text("Authorized Mirror Hostels receipt", totalCardX + 8, summaryY + 26);

  // Note
  const notesY = summaryY + summaryHeight + 12;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...slateGrey);
  doc.text("This is an electronically generated and digitally validated payment receipt.", margin, notesY);

  // Footer
  const footerY = 280;
  doc.setDrawColor(...borderColor);
  doc.setLineWidth(0.3);
  doc.line(margin, footerY, rightX, footerY);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text("Mirror Hostels • Student Housing & Living", margin, footerY + 6);
  doc.text("Electronically Generated Receipt", pageWidth / 2, footerY + 6, { align: "center" });
  doc.text("support@mirrorhostels.com", rightX, footerY + 6, { align: "right" });

  doc.save(`Receipt_${receiptNo}.pdf`);
}

export async function loadAdmissionAssetsInBrowser(user: any): Promise<AdmissionFormAssets> {
  let selfieDataUrl: string | null = null;
  const selfieUrl = user.selfies?.find((s: any) => s.isCurrent)?.fileUrl || user.selfies?.[0]?.fileUrl;

  if (selfieUrl) {
    try {
      const response = await fetch(selfieUrl);
      const blob = await response.blob();
      selfieDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Could not load selfie image for PDF", err);
    }
  }

  let qrDataUrl = "";
  try {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const verifyUrl = `${origin}/verify/${user.id}`;
    const qrRes = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`);
    const qrBlob = await qrRes.blob();
    qrDataUrl = (await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(qrBlob);
    })) || "";
  } catch (err) {
    console.warn("Could not load QR code", err);
  }

  const attachmentDataUrls = new Map<string, string>();
  const allDocs = user.documents || [];
  for (const docItem of allDocs) {
    if (!docItem.fileUrl) continue;

    try {
      const isPdf = docItem.fileUrl.toLowerCase().endsWith(".pdf") || docItem.fileName?.toLowerCase().endsWith(".pdf");
      if (isPdf) continue;

      const res = await fetch(docItem.fileUrl);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      if (base64) {
        attachmentDataUrls.set(docItem.id, base64);
      }
    } catch (err) {
      console.warn("Could not load document image for PDF attachment", docItem.documentType, err);
    }
  }

  return {
    selfieDataUrl,
    qrDataUrl,
    attachmentDataUrls,
  };
}

export async function generateAdmissionFormPDF(user: any) {
  const assets = await loadAdmissionAssetsInBrowser(user);
  const doc = await buildAdmissionFormPDF(user, assets);
  doc.save(admissionFormFilename(user));
}

export { buildAdmissionFormPDF, admissionFormFilename };

