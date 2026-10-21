import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  classifyBill,
  formatCurrencyRs,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
} from "./billing-classification";

export interface DueReportStudent {
  id: string;
  name: string;
  roomBed: string;
  dueMonths: string[]; // e.g. ["Nov '25", "Dec '25", "Feb", "Mar"]
  dueMonthCount: number;
  totalDue: number;
}

export function compileDueReportStudents({
  pickedMonth,
  pickedYear,
  currentYearStudents,
  previousYearStudents = [],
  asOfDate = new Date(),
}: {
  pickedMonth: number;
  pickedYear: number;
  currentYearStudents: any[];
  previousYearStudents?: any[];
  asOfDate?: Date;
}): DueReportStudent[] {
  const prevYear = pickedYear - 1;
  const prevYearMap = new Map<string, any>();
  for (const s of previousYearStudents) {
    prevYearMap.set(s.id, s);
  }

  const results: DueReportStudent[] = [];

  for (const s of currentYearStudents) {
    const dueMonths: string[] = [];
    let totalDue = 0;

    // Check previous year months (months 1-12)
    const prevStudent = prevYearMap.get(s.id);
    if (prevStudent?.monthly) {
      for (let m = 1; m <= 12; m++) {
        const bill = prevStudent.monthly[m];
        if (bill) {
          const c = classifyBill(bill, asOfDate);
          if (c.outstanding > 0) {
            dueMonths.push(`${MONTH_NAMES_SHORT[m - 1]} '${prevYear.toString().slice(-2)}`);
            totalDue += c.outstanding;
          }
        }
      }
    }

    // Check current year months up to pickedMonth
    if (s.monthly) {
      for (let m = 1; m <= pickedMonth; m++) {
        const bill = s.monthly[m];
        if (bill) {
          const c = classifyBill(bill, asOfDate);
          if (c.outstanding > 0) {
            dueMonths.push(MONTH_NAMES_SHORT[m - 1]);
            totalDue += c.outstanding;
          }
        }
      }
    }

    if (totalDue > 0 && dueMonths.length > 0) {
      const activeBed = s.bedAssignments?.[0]?.bed;
      const roomNum = activeBed?.room?.roomNumber;
      const bedLabel = activeBed?.bedLabel;
      const roomBed = roomNum ? `Rm ${roomNum} / Bd ${bedLabel || "-"}` : "-";

      results.push({
        id: s.id,
        name: s.name,
        roomBed,
        dueMonths,
        dueMonthCount: dueMonths.length,
        totalDue,
      });
    }
  }

  results.sort((a, b) => b.totalDue - a.totalDue);
  return results;
}

export function generateDueReportPDF({
  hostelName,
  pickedMonth,
  pickedYear,
  dueStudents: providedDueStudents,
  currentYearStudents,
  previousYearStudents = [],
  asOfDate = new Date(),
  saveToFile = true,
}: {
  hostelName: string;
  pickedMonth: number; // 1-12
  pickedYear: number;
  dueStudents?: DueReportStudent[];
  currentYearStudents?: any[];
  previousYearStudents?: any[];
  asOfDate?: Date;
  saveToFile?: boolean;
}) {
  const dueStudents =
    providedDueStudents ??
    (currentYearStudents
      ? compileDueReportStudents({
          pickedMonth,
          pickedYear,
          currentYearStudents,
          previousYearStudents,
          asOfDate,
        })
      : []);

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  const pickedMonthName = MONTH_NAMES_FULL[pickedMonth - 1] || `Month ${pickedMonth}`;
  const prevYear = pickedYear - 1;

  // Colors
  const primaryNavy: [number, number, number] = [20, 45, 78]; // #142D4E
  const accentRed: [number, number, number] = [220, 38, 38]; // #DC2626
  const slateGrey: [number, number, number] = [100, 116, 139];
  const slateBorder: [number, number, number] = [226, 232, 240];

  // 1. HEADER
  doc.setFillColor(...primaryNavy);
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...primaryNavy);
  doc.text("MIRROR HOSTELS", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...slateGrey);
  doc.text("Student-wise Due Report", margin, 24);

  // Cycle details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...accentRed);
  doc.text(
    `EVALUATION PERIOD: ${prevYear} + UP TO ${pickedMonthName.toUpperCase()} ${pickedYear}`,
    margin,
    30
  );

  // Right-side meta
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...primaryNavy);
  doc.text(hostelName, pageWidth - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...slateGrey);
  doc.text(`Generated: ${format(asOfDate, "dd MMM yyyy, HH:mm")}`, pageWidth - margin, 24, { align: "right" });
  doc.text(`Effective Due Rule: 7th of Month`, pageWidth - margin, 30, { align: "right" });

  doc.setDrawColor(...slateBorder);
  doc.setLineWidth(0.4);
  doc.line(margin, 34, pageWidth - margin, 34);

  // 2. CHECK IF EMPTY ("ALL CLEAR" STATE)
  if (!dueStudents || dueStudents.length === 0) {
    const cardY = 55;
    doc.setFillColor(240, 253, 244); // light green
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.6);
    doc.roundedRect(margin + 10, cardY, contentWidth - 20, 60, 3, 3, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(22, 101, 52); // green 800
    doc.text("ALL CLEAR", pageWidth / 2, cardY + 24, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(21, 128, 61); // green 700
    doc.text(
      `No outstanding dues found across ${hostelName}!`,
      pageWidth / 2,
      cardY + 34,
      { align: "center" }
    );
    doc.setFontSize(9);
    doc.text(
      `All bills for ${prevYear} and up to ${pickedMonthName} ${pickedYear} are fully settled.`,
      pageWidth / 2,
      cardY + 44,
      { align: "center" }
    );

    const cleanHostel = (hostelName || "Hostel").replace(/[^a-zA-Z0-9_-]/g, "_");
    const filename = `Due_Report_${cleanHostel}_${MONTH_NAMES_SHORT[pickedMonth - 1]}_${pickedYear}.pdf`;
    if (saveToFile) doc.save(filename);
    return doc;
  }

  // 3. STATS SUMMARY CARD
  const totalDueSum = dueStudents.reduce((acc, s) => acc + s.totalDue, 0);
  const totalMonthsCount = dueStudents.reduce((acc, s) => acc + s.dueMonthCount, 0);

  const statsY = 38;
  doc.setFillColor(254, 242, 242); // light red
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(margin, statsY, contentWidth, 16, 2, 2, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(153, 27, 27); // red 800
  doc.text(`TOTAL OVERDUE STUDENTS: ${dueStudents.length}`, margin + 5, statsY + 6.5);
  doc.text(
    `TOTAL OUTSTANDING: ${formatCurrencyRs(totalDueSum)}`,
    pageWidth - margin - 5,
    statsY + 6.5,
    { align: "right" }
  );

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(185, 28, 28);
  doc.text(`Total unpaid monthly installments: ${totalMonthsCount}`, margin + 5, statsY + 12);
  doc.text(`Sorted by highest due amount first`, pageWidth - margin - 5, statsY + 12, { align: "right" });

  // 4. AUTOTABLE OF DUE STUDENTS (Sorted most-due first)
  const sortedStudents = [...dueStudents].sort((a, b) => b.totalDue - a.totalDue);

  const tableHeaders = ["#", "Student Name", "Room / Bed", "Due Months", "Count", "Total Due"];
  const tableRows = sortedStudents.map((s, idx) => [
    idx + 1,
    s.name,
    s.roomBed || "-",
    s.dueMonths.join(", "),
    s.dueMonthCount,
    formatCurrencyRs(s.totalDue),
  ]);

  autoTable(doc, {
    startY: 58,
    margin: { left: margin, right: margin, bottom: 15 },
    head: [tableHeaders],
    body: tableRows,
    theme: "striped",
    headStyles: {
      fillColor: primaryNavy,
      textColor: [255, 255, 255],
      fontStyle: "bold",
      fontSize: 8,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
    },
    styles: {
      font: "helvetica",
      fontSize: 7.5,
      cellPadding: { top: 2.5, bottom: 2.5, left: 2, right: 2 },
      lineColor: slateBorder,
      lineWidth: 0.1,
      textColor: [33, 37, 41],
    },
    columnStyles: {
      0: { cellWidth: 8, halign: "center" },
      1: { cellWidth: 42, fontStyle: "bold" },
      2: { cellWidth: 26 },
      3: { cellWidth: 70 }, // Due months list
      4: { cellWidth: 14, halign: "center", fontStyle: "bold" },
      5: { cellWidth: 22, halign: "right", fontStyle: "bold", textColor: [185, 28, 28] },
    },
    didDrawPage: () => {
      const totalPages = (doc as any).internal.getNumberOfPages();
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      doc.setFontSize(7.5);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(148, 163, 184);
      doc.text(
        `Page ${currentPage} of ${totalPages}  •  Due Report (${MONTH_NAMES_SHORT[pickedMonth - 1]} ${pickedYear})`,
        pageWidth / 2,
        pageHeight - 8,
        { align: "center" }
      );
    },
  });

  const cleanHostel = (hostelName || "Hostel").replace(/[^a-zA-Z0-9_-]/g, "_");
  const filename = `Due_Report_${cleanHostel}_${MONTH_NAMES_SHORT[pickedMonth - 1]}_${pickedYear}.pdf`;
  if (saveToFile) doc.save(filename);
  return doc;
}
