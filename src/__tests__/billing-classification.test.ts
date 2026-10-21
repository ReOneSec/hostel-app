import { describe, it, expect } from "vitest";
import {
  effectiveDueDate,
  getBillAmounts,
  billIsOverdue,
  classifyBill,
  classifyFee,
  formatCurrencyRs
} from "@/lib/billing-classification";

describe("billing-classification", () => {
  it("computes 7th of the month as effective due date for monthly bills", () => {
    const bill = { month: 10, year: 2026 };
    const due = effectiveDueDate(bill);
    expect(due).not.toBeNull();
    expect(due?.getFullYear()).toBe(2026);
    expect(due?.getMonth()).toBe(9); // 0-indexed October
    expect(due?.getDate()).toBe(7);
  });

  it("identifies bill as OVERDUE after 7th of the month even if stored as GENERATED", () => {
    const bill = {
      month: 10,
      year: 2026,
      amount: 1500,
      status: "GENERATED",
    };
    // 8th October 2026 -> after 7th
    const oct8 = new Date(2026, 9, 8);
    expect(billIsOverdue(bill, oct8)).toBe(true);
    const classification = classifyBill(bill, oct8);
    expect(classification.status).toBe("OVERDUE");
    expect(classification.label).toBe("OVERDUE");
    expect(classification.isOverdue).toBe(true);
  });

  it("identifies bill as DUE (not overdue) on or before the 7th", () => {
    const bill = {
      month: 10,
      year: 2026,
      amount: 1500,
      status: "GENERATED",
    };
    // 5th October 2026 -> before 7th
    const oct5 = new Date(2026, 9, 5);
    expect(billIsOverdue(bill, oct5)).toBe(false);
    const classification = classifyBill(bill, oct5);
    expect(classification.status).toBe("DUE");
    expect(classification.label).toBe("Due");
    expect(classification.isOverdue).toBe(false);
  });

  it("treats paid bills as never overdue", () => {
    const bill = {
      month: 10,
      year: 2026,
      amount: 1500,
      paidAmount: 1500,
      status: "PAID",
    };
    const oct20 = new Date(2026, 9, 20);
    expect(billIsOverdue(bill, oct20)).toBe(false);
    const classification = classifyBill(bill, oct20);
    expect(classification.status).toBe("PAID");
    expect(classification.label).toBe("Paid");
  });

  it("handles partial payments with B&W status word", () => {
    const bill = {
      month: 10,
      year: 2026,
      totalAmount: 2000,
      paidAmount: 1200,
      status: "PARTIALLY_PAID",
    };
    const oct5 = new Date(2026, 9, 5);
    const classification = classifyBill(bill, oct5);
    expect(classification.status).toBe("PARTIALLY_PAID");
    expect(classification.label).toBe("Part · due Rs 800");
    expect(classification.outstanding).toBe(800);
  });

  it("never treats ₹0 placeholder bills as due", () => {
    const bill = {
      month: 10,
      year: 2026,
      amount: 0,
      totalAmount: 0,
      status: "GENERATED",
    };
    const oct20 = new Date(2026, 9, 20);
    expect(billIsOverdue(bill, oct20)).toBe(false);
    const classification = classifyBill(bill, oct20);
    expect(classification.status).toBe("UNBILLED");
    expect(classification.outstanding).toBe(0);
  });

  it("formats B&W labels for standalone fee cells", () => {
    expect(classifyFee({ amount: 500, status: "PAID" })).toEqual({
      isPaid: true,
      status: "PAID",
      label: "Paid",
      amount: 500,
    });
    expect(classifyFee({ amount: 500, status: "GENERATED" })).toEqual({
      isPaid: false,
      status: "DUE",
      label: "unpaid",
      amount: 500,
    });
  });

  it("formats currency without ₹ glyph for jsPDF safe rendering", () => {
    expect(formatCurrencyRs(1500)).toBe("Rs 1,500");
  });
});
