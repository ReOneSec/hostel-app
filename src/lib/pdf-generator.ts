import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

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

export async function generateAdmissionFormPDF(user: any) {
  const doc = new jsPDF();
  const profile = user.studentProfile || {};
  const hostelAssign = user.hostelAssignments?.[0];
  const roomAssign = user.roomAssignments?.[0];
  const bedAssign = user.bedAssignments?.[0];

  let selfieDataUrl: any = null;
  const selfieUrl = user.selfies?.find((s: any) => s.isCurrent)?.fileUrl || user.selfies?.[0]?.fileUrl;

  if (selfieUrl) {
    try {
      const response = await fetch(selfieUrl);
      const blob = await response.blob();
      selfieDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.warn("Could not load selfie image for PDF", err);
    }
  }

  let qrDataUrl: any = null;
  try {
    const verifyUrl = `${window.location.origin}/verify/${user.id}`;
    const qrRes = await fetch(`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(verifyUrl)}`);
    const qrBlob = await qrRes.blob();
    qrDataUrl = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(qrBlob);
    });
  } catch (err) {
    console.warn("Could not load QR code", err);
  }

  // Application Reference Number
  const appNumber = `APP-${new Date().getFullYear()}-${user.id.slice(-4).toUpperCase()}`;

  const primaryColor: [number, number, number] = [10, 37, 64]; // Deep Navy
  const accentColor: [number, number, number] = [39, 174, 96]; // Emerald

  // --- 1. PREMIUM HEADER ---
  doc.setFontSize(24);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("MIRROR HOSTELS", 14, 22);

  doc.setFontSize(10);
  doc.setTextColor(100, 110, 120);
  doc.setFont("helvetica", "normal");
  doc.text("Student Admission & Accommodation Agreement", 14, 28);

  // Right side meta box
  doc.setFontSize(9);
  doc.setTextColor(100, 110, 120);
  doc.setFont("helvetica", "normal");
  doc.text(`App ID:`, 135, 18);
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.text(appNumber, 150, 18);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text(`Date:`, 135, 23);
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.text(format(new Date(), "dd MMM yyyy"), 150, 23);

  const approvedDocs = user.documents?.filter((d: any) => d.status === "VERIFIED" || d.status === "APPROVED") || [];
  const systemStatus = approvedDocs.length > 0 ? "APPROVED" : "PENDING";

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text(`Status:`, 135, 28);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(systemStatus === "APPROVED" ? 39 : 231, systemStatus === "APPROVED" ? 174 : 76, systemStatus === "APPROVED" ? 96 : 60);
  doc.text(systemStatus, 150, 28);

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 178, 12, 18, 18);
  }

  // Header separator
  doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setLineWidth(0.5);
  doc.line(14, 34, 196, 34);

  let currentY = 40;

  // --- 2. STUDENT PROFILE CARD ---
  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 36, 2, 2, "FD");

  // Profile Photo
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(18, currentY + 4, 22, 28, 1, 1, "FD");

  if (selfieDataUrl) {
    const formatType = selfieDataUrl.toString().includes('image/png') ? 'PNG' : 'JPEG';
    doc.addImage(selfieDataUrl, formatType, 18, currentY + 4, 22, 28);
  } else {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("Photo\nArea", 29, currentY + 17, { align: "center" });
  }

  // Student Details inside card
  doc.setFontSize(14);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text(profile.fullName || user.username || "Student Name", 45, currentY + 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text("Student ID:", 45, currentY + 20);
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.text(user.id.slice(-6).toUpperCase(), 65, currentY + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text("Mobile:", 45, currentY + 26);
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.text(profile.mobile || "N/A", 65, currentY + 26);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text("Gender:", 120, currentY + 20);
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.text(`${profile.gender || "N/A"}  •  ${profile.bloodGroup || "N/A"}`, 135, currentY + 20);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text("DOB:", 120, currentY + 26);
  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "bold");
  doc.text(profile.dob || profile.dateOfBirth ? format(new Date(profile.dob || profile.dateOfBirth), "dd MMM yyyy") : "N/A", 135, currentY + 26);

  currentY += 44;

  // --- 3. SECTION CARDS HELPER ---
  const drawSection = (title: string, data: any[][], yPos: number, headerColor: [number, number, number] = primaryColor) => {
    autoTable(doc, {
      startY: yPos,
      head: [[title, ""]],
      body: data,
      theme: "plain",
      headStyles: { fillColor: headerColor, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10, cellPadding: 3 },
      bodyStyles: { fillColor: [250, 252, 254], textColor: [33, 37, 41], fontSize: 9, cellPadding: 3 },
      alternateRowStyles: { fillColor: [244, 247, 250] },
      columnStyles: {
        0: { fontStyle: "normal", textColor: [100, 110, 120], cellWidth: 45 },
        1: { fontStyle: "bold", cellWidth: 137 }
      },
      margin: { left: 14, right: 14 },
      tableLineWidth: 0.1,
      tableLineColor: [220, 225, 230],
    });
    return (doc as any).lastAutoTable.finalY + 6;
  };

  // Personal
  const personalData = [
    ["Email Address", profile.personalEmail || user.email || "N/A"],
    ["Aadhaar Number", profile.aadhaarNumber || "N/A"]
  ];
  currentY = drawSection("PERSONAL INFORMATION", personalData, currentY);

  // Guardian
  const guardianData = [
    ["Father's Name", profile.fatherName || "N/A"],
    ["Mother's Name", profile.motherName || "N/A"],
    ["Guardian Name", `${profile.guardianName || "N/A"} (${profile.guardianRelation || "N/A"})`],
    ["Parent/Alt Mobile", profile.parentMobile || profile.guardianMobile || "N/A"],
    ["Emergency Contact", profile.emergencyContactName ? `${profile.emergencyContactName} (${profile.emergencyContactNumber})` : (profile.emergencyContact || "N/A")]
  ];
  currentY = drawSection("GUARDIAN INFORMATION", guardianData, currentY);

  // Address
  const addressData = [
    ["Permanent Address", profile.permanentAddress || profile.address || "N/A"]
  ];
  currentY = drawSection("ADDRESS DETAILS", addressData, currentY);

  // Accommodation
  const accomData = [
    ["Hostel Name", hostelAssign?.hostel?.name || "Not Assigned"],
    ["Room & Bed", `${roomAssign?.room?.roomNumber || "Unassigned Room"} - ${bedAssign?.bed?.bedLabel || "Unassigned Bed"}`],
    ["Joining Date", user.joiningDate || profile.completedAt || user.createdAt ? format(new Date(user.joiningDate || profile.completedAt || user.createdAt), "dd MMM yyyy") : "N/A"]
  ];
  currentY = drawSection("ACCOMMODATION", accomData, currentY);

  if (currentY > 230) { doc.addPage(); currentY = 20; }

  // Medical
  const medicalData = [
    ["Chronic Illnesses", profile.chronicIllnesses || "None reported"],
    ["Allergies", profile.allergies || "None reported"],
    ["Regular Meds", profile.regularMedications || "None reported"]
  ];
  currentY = drawSection("MEDICAL DETAILS", medicalData, currentY, [192, 57, 43]); // Subtle red header for medical

  if (currentY > 230) { doc.addPage(); currentY = 20; }

  // Financial
  const feeData = [
    ["Security Deposit", "As per standard hostel policy"],
    ["Monthly Rent", "As per assigned room configuration"],
    ["Establishment Fees", "Applicable as per assignment"],
  ];
  currentY = drawSection("FEE & AGREEMENT", feeData, currentY, accentColor); // Emerald header for financial

  // --- 5. MODERN TERMS & CONDITIONS ---
  if (currentY > 160) { doc.addPage(); currentY = 20; }

  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(220, 225, 230);
  doc.roundedRect(14, currentY, 182, 60, 2, 2, "FD");

  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS AND CONDITIONS", 20, currentY + 8);

  doc.setFontSize(8);
  doc.setTextColor(70, 80, 90);
  doc.setFont("helvetica", "normal");

  const terms = [
    "1. I agree to abide by all the rules and regulations of the hostel, which may be amended from time to time.",
    "2. Anti-Ragging Undertaking: I understand that Mirror Hostels has a zero-tolerance policy towards ragging,",
    "    harassment, and the use of alcohol/illegal substances.",
    "3. I understand that the hostel fees and mess charges must be paid on or before the due date, failing which late fees may apply.",
    "4. I shall be held responsible for any damage caused to hostel property by me, and I agree to bear the cost of repair or replacement.",
    "5. I understand that the management reserves the right to terminate my accommodation in case of misconduct.",
    "6. Privacy Consent: I declare that all info is true and I consent to the processing of my data."
  ];

  let ty = currentY + 15;
  terms.forEach(term => {
    doc.text(term, 20, ty);
    ty += 5;
  });

  const consentDate = user.privacyConsentAt ? format(new Date(user.privacyConsentAt), "MMM d, yyyy HH:mm:ss") : format(new Date(user.createdAt || new Date()), "MMM d, yyyy HH:mm:ss");

  currentY += 75;

  // --- 6. SIGNATURE AREA ---
  if (currentY > 240) { doc.addPage(); currentY = 40; }

  doc.setTextColor(33, 37, 41);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  doc.setFontSize(9);
  doc.text(`[ DIGITAL CONSENT ]`, 32, currentY, { align: "center" });

  doc.setFontSize(8);
  doc.text(consentDate, 32, currentY + 6, { align: "center" });

  doc.text("GIVEN BY Student", 32, currentY + 12, { align: "center" });

  doc.setTextColor(33, 37, 41);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  doc.text("________________________", 80, currentY);
  doc.text("Guardian Signature", 86, currentY + 6);

  doc.text("________________________", 140, currentY);
  doc.text("Hostel Authority", 146, currentY + 6);

  if (systemStatus === "APPROVED") {
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.setFontSize(8);
    doc.text(`[ DIGITALLY VERIFIED ]`, 142, currentY - 4);
  } else {
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.text(`[ PENDING REVIEW ]`, 146, currentY - 4);
  }

  // --- OFFICE USE SECTION ---
  currentY += 20;
  if (currentY > 250) { doc.addPage(); currentY = 20; }

  doc.setDrawColor(220, 225, 230);
  doc.setFillColor(250, 252, 254);
  doc.roundedRect(14, currentY, 182, 26, 2, 2, "FD");

  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text("FOR OFFICE USE ONLY", 105, currentY + 7, { align: "center" });
  doc.setDrawColor(220, 225, 230);
  doc.line(14, currentY + 10, 196, currentY + 10);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 110, 120);
  doc.text(`System Status:`, 20, currentY + 17);
  doc.text(`Date of Verification:`, 20, currentY + 22);
  doc.text(`Verified By:`, 110, currentY + 17);

  let verifierName = "Pending Verification";
  let verifiedDate = "Pending Verification";
  if (approvedDocs.length > 0) {
    const latestVerifiedDoc = [...approvedDocs].sort((a: any, b: any) => new Date(b.verifiedAt || b.uploadedAt || 0).getTime() - new Date(a.verifiedAt || a.uploadedAt || 0).getTime())[0];
    verifierName = latestVerifiedDoc?.verifierName || latestVerifiedDoc?.verifiedBy || "System Admin";
    const dateToUse = latestVerifiedDoc?.verifiedAt || latestVerifiedDoc?.uploadedAt;
    verifiedDate = dateToUse ? format(new Date(dateToUse), "dd MMM yyyy, HH:mm") : "Verified";
  }

  if (systemStatus === "APPROVED") {
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
  } else {
    doc.setTextColor(231, 76, 60);
  }
  doc.setFont("helvetica", "bold");
  doc.text(`[ ${systemStatus} ]`, 45, currentY + 17);

  doc.setTextColor(33, 37, 41);
  doc.text(verifiedDate, 50, currentY + 22);
  doc.text(verifierName, 125, currentY + 17);

  // Attachments
  const allDocs = user.documents || [];
  for (const docItem of allDocs) {
    if (!docItem.fileUrl) continue;

    try {
      const isPdf = docItem.fileUrl.toLowerCase().endsWith('.pdf') || docItem.fileName?.toLowerCase().endsWith('.pdf');
      if (isPdf) continue;

      const res = await fetch(docItem.fileUrl);
      const blob = await res.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const formatType = base64.includes('image/png') ? 'PNG' : 'JPEG';

      doc.addPage();
      doc.setFontSize(14);
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setFont("helvetica", "bold");
      doc.text(`ATTACHMENT: ${docItem.documentType.replace(/_/g, ' ')}`, 105, 20, { align: "center" });
      doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.setLineWidth(0.5);
      doc.line(14, 25, 196, 25);

      const imgProps = doc.getImageProperties(base64);
      const pdfWidth = 180;
      const pdfHeight = 240;

      const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
      const width = imgProps.width * ratio;
      const height = imgProps.height * ratio;

      const x = (210 - width) / 2;

      doc.addImage(base64, formatType, x, 35, width, height);
      doc.setDrawColor(200, 200, 200);
      doc.rect(x, 35, width, height);
    } catch (err) {
      console.warn("Could not load document image for PDF attachment", docItem.documentType, err);
    }
  }

  // --- FOOTER AND WATERMARKS ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Watermark
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.05 }));
    doc.setTextColor(...primaryColor);
    doc.setFontSize(60);
    doc.setFont("helvetica", "bold");
    doc.text("MIRROR HOSTELS", 105, 150, { align: "center", angle: 45 });
    doc.restoreGraphicsState();

    // Footer
    doc.setDrawColor(220, 225, 230);
    doc.setLineWidth(0.5);
    doc.line(14, 282, 196, 282);

    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Mirror Hostels • Secure Digital Admission Record`, 14, 288);
    doc.text(`Page ${i} of ${pageCount}`, 105, 288, { align: "center" });
    doc.text(`support@mirrorhostels.com`, 196, 288, { align: "right" });
  }

  doc.save(`Admission_Form_${(profile.fullName || user.username || "Student").replace(/\s+/g, '_')}.pdf`);
}

