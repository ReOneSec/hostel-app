import {
  classifyBill,
  classifyFee,
  billIsOverdue,
  MONTH_NAMES_SHORT,
  MONTH_NAMES_FULL,
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

export function generateRegisterCSV({
  hostelName,
  year,
  students,
  asOfDate = new Date(),
}: {
  hostelName: string;
  year: number;
  students: StudentRegisterItem[];
  asOfDate?: Date;
}): string {
  const lines: string[] = [];

  // Helper to safely quote CSV fields
  const escapeCsv = (val: any): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  // 1. Meta rows
  lines.push(escapeCsv("MIRROR HOSTELS — BILLING REGISTER"));
  lines.push(`${escapeCsv("Hostel:")},${escapeCsv(hostelName)}`);
  lines.push(`${escapeCsv("Year:")},${escapeCsv(year)}`);
  lines.push(`${escapeCsv("Generated At:")},${escapeCsv(asOfDate.toLocaleString("en-IN"))}`);
  lines.push(""); // empty separator

  // 2. Header Columns
  const headers = [
    "Student Name",
    "Room / Bed",
    "Base Rent (Rs)",
    "Bed Fee (Rs)",
    "Est Fee (Rs)",
    ...MONTH_NAMES_SHORT,
    "Overdue Months",
    "Overdue Amount (Rs)",
    "Status",
  ];
  lines.push(headers.map(escapeCsv).join(","));

  // Track summary and overdue details
  let totalBilled = 0;
  let totalCollected = 0;
  let totalOverdueAmount = 0;
  let totalOverdueMonthsCount = 0;

  interface OverdueDetail {
    studentName: string;
    roomBed: string;
    monthName: string;
    amountDue: number;
    dueDateStr: string;
    daysOverdue: number;
  }
  const overdueDetails: OverdueDetail[] = [];

  // 3. Data Rows
  for (const s of students) {
    const bed = s.bedAssignments?.[0]?.bed;
    const roomBed = bed ? `Room ${bed.room?.roomNumber || "-"} - Bed ${bed.bedLabel || "-"}` : "-";
    const baseRent = Number(s.baseRent) || 0;

    const bedFeeClass = classifyFee(s.bedFee);
    const estFeeClass = classifyFee(s.estFee);

    let studentOverdueCount = 0;
    let studentOverdueAmount = 0;

    const monthCells: string[] = [];

    for (let m = 1; m <= 12; m++) {
      const bill = s.monthly?.[m];
      const classified = classifyBill(bill, asOfDate);

      if (classified.status === "UNBILLED") {
        monthCells.push("-");
      } else {
        totalBilled += classified.totalAmount;
        totalCollected += classified.paidAmount;

        if (classified.isOverdue) {
          totalOverdueAmount += classified.outstanding;
          totalOverdueMonthsCount++;
          studentOverdueCount++;
          studentOverdueAmount += classified.outstanding;

          overdueDetails.push({
            studentName: s.name,
            roomBed,
            monthName: `${MONTH_NAMES_SHORT[m - 1]} ${year}`,
            amountDue: classified.outstanding,
            dueDateStr: classified.effectiveDueDate ? classified.effectiveDueDate.toLocaleDateString("en-IN") : "-",
            daysOverdue: classified.daysOverdue,
          });

          monthCells.push(`${classified.totalAmount} (${classified.label})`);
        } else if (classified.status === "PAID") {
          monthCells.push(`${classified.totalAmount} (Paid)`);
        } else if (classified.status === "PARTIALLY_PAID") {
          monthCells.push(`${classified.totalAmount} (Part - Due: Rs ${classified.outstanding})`);
        } else {
          monthCells.push(`${classified.totalAmount} (Due)`);
        }
      }
    }

    const row = [
      s.name,
      roomBed,
      baseRent,
      bedFeeClass.amount > 0 ? `${bedFeeClass.amount} (${bedFeeClass.label})` : "-",
      estFeeClass.amount > 0 ? `${estFeeClass.amount} (${estFeeClass.label})` : "-",
      ...monthCells,
      studentOverdueCount,
      studentOverdueAmount,
      s.isActive ? "Active" : "Inactive",
    ];

    lines.push(row.map(escapeCsv).join(","));
  }

  // 4. Summary Block
  lines.push("");
  lines.push(escapeCsv("=== SUMMARY ==="));
  lines.push(`${escapeCsv("Total Students:")},${escapeCsv(students.length)}`);
  lines.push(`${escapeCsv("Active Students:")},${escapeCsv(students.filter((s) => s.isActive).length)}`);
  lines.push(`${escapeCsv("Total Billed (Rs):")},${escapeCsv(Math.round(totalBilled))}`);
  lines.push(`${escapeCsv("Total Collected (Rs):")},${escapeCsv(Math.round(totalCollected))}`);
  lines.push(`${escapeCsv("Total Overdue Amount (Rs):")},${escapeCsv(Math.round(totalOverdueAmount))}`);
  lines.push(`${escapeCsv("Total Overdue Month Records:")},${escapeCsv(totalOverdueMonthsCount)}`);

  // 5. Overdue Details Section (worst first: longest daysOverdue, then highest amountDue)
  lines.push("");
  lines.push(escapeCsv("=== OVERDUE DETAILS (Worst First) ==="));
  const overdueHeaders = [
    "Student Name",
    "Room / Bed",
    "Billing Month",
    "Amount Due (Rs)",
    "Effective Due Date",
    "Days Overdue",
  ];
  lines.push(overdueHeaders.map(escapeCsv).join(","));

  overdueDetails.sort((a, b) => {
    if (b.daysOverdue !== a.daysOverdue) {
      return b.daysOverdue - a.daysOverdue;
    }
    return b.amountDue - a.amountDue;
  });

  if (overdueDetails.length === 0) {
    lines.push(escapeCsv("No overdue bills found. All clear!"));
  } else {
    for (const od of overdueDetails) {
      lines.push(
        [
          od.studentName,
          od.roomBed,
          od.monthName,
          Math.round(od.amountDue),
          od.dueDateStr,
          od.daysOverdue,
        ]
          .map(escapeCsv)
          .join(",")
      );
    }
  }

  // UTF-8 BOM (\uFEFF) + CRLF (\r\n) for perfect Excel compatibility
  return "\uFEFF" + lines.join("\r\n");
}

export function downloadRegisterCSV(params: {
  hostelName: string;
  year: number;
  students: StudentRegisterItem[];
  asOfDate?: Date;
}) {
  const csvContent = generateRegisterCSV(params);
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const cleanHostelName = (params.hostelName || "Hostel").replace(/[^a-zA-Z0-9_-]/g, "_");
  link.setAttribute("href", url);
  link.setAttribute("download", `Billing_Register_${cleanHostelName}_${params.year}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
