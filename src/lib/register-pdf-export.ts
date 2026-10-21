import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  classifyBill,
  classifyFee,
  formatCurrencyRs,
  MONTH_NAMES_SHORT,
} from "./billing-classification";

interface StudentRegisterItem {
  id: string;
  name: string;
  username?: string;
  isActive?: boolean;
  baseRent?: number;
  bedFee?: { id: string | null; amount: number; status: string };
  estFee?: { id: string | null; amount: number; status: string };
  bedAssignments?: any[];
  monthly?: Record<number, any>;
}

export function generateRegisterPDF({
  hostelName,
  year,
  students,
  asOfDate = new Date(),
  saveToFile = true,
  configData,
}: {
  hostelName: string;
  year: number;
  students: StudentRegisterItem[];
  asOfDate?: Date;
  saveToFile?: boolean;
  configData?: any;
}) {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277mm

  // Palette (Slate design tokens matching app)
  const slateHeaderBg: [number, number, number] = [30, 41, 59]; // Slate 800 #1E293B
  const slateTextMuted: [number, number, number] = [148, 163, 184]; // Slate 400
  const slateBorder: [number, number, number] = [226, 232, 240]; // Slate 200

  // 1. FLAT SLATE HEADER BAND
  doc.setFillColor(...slateHeaderBg);
  doc.rect(margin, 8, contentWidth, 22, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("MIRROR HOSTELS — BILLING REGISTER", margin + 5, 17);

  // Subtitle: Hostel & Year
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...slateTextMuted);
  doc.text(`${hostelName.toUpperCase()}  •  CALENDAR YEAR ${year}`, margin + 5, 24);

  // Calculate high-level stats for top header right
  let totalOverdueSum = 0;
  let overdueStudentCount = 0;

  for (const s of students) {
    let studentHasOverdue = false;
    for (let m = 1; m <= 12; m++) {
      const c = classifyBill(s.monthly?.[m], asOfDate);
      if (c.isOverdue) {
        totalOverdueSum += c.outstanding;
        studentHasOverdue = true;
      }
    }
    if (studentHasOverdue) overdueStudentCount++;
  }

  // Right-aligned header metadata
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(255, 255, 255);
  doc.text(`Generated: ${format(asOfDate, "dd MMM yyyy, HH:mm")}`, pageWidth - margin - 5, 16, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateTextMuted);
  doc.text(
    `Students: ${students.length} (${students.filter(s => s.isActive).length} active)  |  Overdue: ${formatCurrencyRs(totalOverdueSum)} (${overdueStudentCount} students)`,
    pageWidth - margin - 5,
    23,
    { align: "right" }
  );

  // 2. STATUS LEGEND BAND (Under header)
  const legendY = 32;
  doc.setFontSize(7.5);

  const legendItems = [
    { text: "Paid", color: [4, 120, 87], bg: [236, 253, 245] }, // emerald
    { text: "Due", color: [51, 65, 85], bg: [241, 245, 249] }, // slate
    { text: "Part · due Rs X", color: [180, 83, 9], bg: [255, 251, 235] }, // amber
    { text: "OVERDUE", color: [185, 28, 28], bg: [254, 242, 242] }, // rose
    { text: "Unbilled (-)", color: [148, 163, 184], bg: [255, 255, 255] },
  ];

  let legendX = margin;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(71, 85, 105);
  doc.text("Legend (B&W printable):", legendX, legendY + 3.5);
  legendX += 34;

  for (const item of legendItems) {
    doc.setFillColor(item.bg[0], item.bg[1], item.bg[2]);
    doc.setDrawColor(item.color[0], item.color[1], item.color[2]);
    doc.setLineWidth(0.2);
    doc.roundedRect(legendX, legendY, 24, 4.5, 1, 1, "FD");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.text, legendX + 12, legendY + 3.2, { align: "center" });

    legendX += 27;
  }

  // 3. AUTOTABLE PREPARATION
  const tableHeaders = [
    "#",
    "Student Name",
    "Room / Bed",
    "Base",
    "Bed Fee",
    "Est Fee",
    ...MONTH_NAMES_SHORT,
    "Overdue",
  ];

  const tableRows: any[] = [];

  students.forEach((s, idx) => {
    const bed = s.bedAssignments?.[0]?.bed;
    const roomBed = bed ? `R${bed.room?.roomNumber || "-"} ${bed.bedLabel || "-"}` : "-";
    const baseRent = Number(s.baseRent) || 0;

    const bedClass = classifyFee(s.bedFee);
    const estClass = classifyFee(s.estFee);

    let studentOverdueSum = 0;

    const monthCells: string[] = [];
    for (let m = 1; m <= 12; m++) {
      const c = classifyBill(s.monthly?.[m], asOfDate);
      if (c.status === "UNBILLED") {
        monthCells.push("-");
      } else {
        if (c.isOverdue) studentOverdueSum += c.outstanding;
        // B&W status word printed under the amount (App v1.13.2)
        monthCells.push(`${Math.round(c.totalAmount)}\n${c.label}`);
      }
    }

    tableRows.push([
      idx + 1,
      s.name,
      roomBed,
      baseRent > 0 ? `${baseRent}` : "-",
      bedClass.amount > 0 ? `${bedClass.amount}\n${bedClass.label}` : "-",
      estClass.amount > 0 ? `${estClass.amount}\n${estClass.label}` : "-",
      ...monthCells,
      studentOverdueSum > 0 ? `Rs ${Math.round(studentOverdueSum)}` : "-",
    ]);
  });

  autoTable(doc, {
    startY: 38,
    margin: { left: 8, right: 8, bottom: 12 },
    tableWidth: 281,
    head: [tableHeaders],
    body: tableRows,
    theme: "grid",
    styles: {
      font: "helvetica",
      fontSize: 5.8,
      cellPadding: { top: 1.2, bottom: 1.2, left: 0.5, right: 0.5 },
      lineColor: slateBorder,
      lineWidth: 0.15,
      halign: "center",
      valign: "middle",
      textColor: [33, 37, 41],
    },
    headStyles: {
      fillColor: slateHeaderBg,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 6.2,
      halign: "center",
      cellPadding: { top: 1.8, bottom: 1.8, left: 0.5, right: 0.5 },
    },
    columnStyles: {
      0: { cellWidth: 7 }, // #
      1: { cellWidth: 28, halign: "left", fontStyle: "bold" }, // Student Name
      2: { cellWidth: 16, halign: "left" }, // Room / Bed
      3: { cellWidth: 11 }, // Base
      4: { cellWidth: 11 }, // Bed Fee
      5: { cellWidth: 11 }, // Est Fee
      18: { cellWidth: 17, fontStyle: "bold", textColor: [185, 28, 28] }, // Overdue
    },
    didParseCell: (data) => {
      // Color tinting for month cells based on B&W text
      if (data.section === "body" && data.column.index >= 6 && data.column.index <= 17) {
        const text = String(data.cell.raw || "");
        if (text.includes("OVERDUE")) {
          data.cell.styles.fillColor = [254, 242, 242]; // light red
          data.cell.styles.textColor = [185, 28, 28]; // red text
          data.cell.styles.fontStyle = "bold";
        } else if (text.includes("Paid")) {
          data.cell.styles.fillColor = [236, 253, 245]; // light emerald
          data.cell.styles.textColor = [4, 120, 87];
        } else if (text.includes("Part")) {
          data.cell.styles.fillColor = [255, 251, 235]; // light amber
          data.cell.styles.textColor = [180, 83, 9];
        } else if (text.includes("Due")) {
          data.cell.styles.fillColor = [241, 245, 249]; // light slate
          data.cell.styles.textColor = [51, 65, 85];
        }
      }
      // Overdue column cell styling
      if (data.section === "body" && data.column.index === 18) {
        const val = String(data.cell.raw || "");
        if (val !== "-") {
          data.cell.styles.fillColor = [254, 242, 242];
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${currentPage} of ${totalPages}  •  Mirror Hostels Billing Register`,
        pageWidth / 2,
        pageHeight - 6,
        { align: "center" }
      );
    },
  });

  const cleanHostelName = (hostelName || "Hostel").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Billing_Register_${cleanHostelName}_${year}.pdf`;

  if (saveToFile) {
    doc.save(filename);
  }
  return doc;
}
