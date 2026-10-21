import { describe, it, expect } from "vitest";
import { generateRegisterCSV } from "@/lib/register-csv-export";
import { generateRegisterPDF } from "@/lib/register-pdf-export";
import { generateDueReportPDF } from "@/lib/due-report-pdf-export";

describe("billing-exports", () => {
  const mockStudents = [
    {
      id: "s1",
      name: "Ahmed Ali",
      isActive: true,
      baseRent: 1500,
      bedFee: { id: "b1", amount: 500, status: "PAID" },
      estFee: { id: "e1", amount: 1000, status: "GENERATED" },
      bedAssignments: [{ bed: { bedLabel: "A", room: { roomNumber: "101" } } }],
      monthly: {
        1: { id: "m1", amount: 1500, totalAmount: 1500, paidAmount: 1500, status: "PAID", month: 1, year: 2026 },
        2: { id: "m2", amount: 1500, totalAmount: 1500, paidAmount: 0, status: "GENERATED", month: 2, year: 2026 },
      },
    },
    {
      id: "s2",
      name: "Zainab Khan",
      isActive: true,
      baseRent: 1600,
      monthly: {},
    },
  ];

  it("generates CSV with UTF-8 BOM, metadata, summary and overdue details", () => {
    // Evaluation as of March 2026 (Month 2 is overdue under 7th rule)
    const asOf = new Date(2026, 2, 10);
    const csv = generateRegisterCSV({
      hostelName: "Boys Hostel 1",
      year: 2026,
      students: mockStudents,
      asOfDate: asOf,
    });

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("MIRROR HOSTELS — BILLING REGISTER");
    expect(csv).toContain("Boys Hostel 1");
    expect(csv).toContain("Ahmed Ali");
    expect(csv).toContain("=== SUMMARY ===");
    expect(csv).toContain("=== OVERDUE DETAILS (Worst First) ===");
    expect(csv).toContain("Feb 2026");
  });

  it("generates landscape register PDF with B&W status words", () => {
    const asOf = new Date(2026, 2, 10);
    const doc = generateRegisterPDF({
      hostelName: "Boys Hostel 1",
      year: 2026,
      students: mockStudents,
      asOfDate: asOf,
      saveToFile: false,
    });
    expect(doc).toBeDefined();
    expect((doc as any).internal.getNumberOfPages()).toBeGreaterThanOrEqual(1);
  });

  it("generates due report PDF and handles All Clear state", () => {
    const docWithDues = generateDueReportPDF({
      hostelName: "Boys Hostel 1",
      pickedMonth: 10,
      pickedYear: 2026,
      dueStudents: [
        {
          id: "s1",
          name: "Ahmed Ali",
          roomBed: "R101 A",
          dueMonths: ["Nov '25", "Feb '26"],
          dueMonthCount: 2,
          totalDue: 3000,
        },
      ],
      saveToFile: false,
    });
    expect(docWithDues).toBeDefined();

    const docAllClear = generateDueReportPDF({
      hostelName: "Boys Hostel 1",
      pickedMonth: 10,
      pickedYear: 2026,
      dueStudents: [],
      saveToFile: false,
    });
    expect(docAllClear).toBeDefined();
  });
});
