/**
 * Shared Billing Classification & 7th-of-Month Overdue Rule (App Parity: v1.10.0 – v1.13.4)
 * Single source of truth across Register Grid, CSV Export, Register PDF, Due Report,
 * Student Bills view, and Student Dashboard.
 */

export interface BillLike {
  id?: string | null;
  month?: number | null;
  year?: number | null;
  amount?: number | string | null;
  rentAmount?: number | string | null;
  totalAmount?: number | string | null;
  paidAmount?: number | string | null;
  bedFee?: number | string | null;
  establishmentFee?: number | string | null;
  lateFee?: number | string | null;
  messCharge?: number | string | null;
  status?: string | null;
  billType?: string | null;
  dueDate?: string | Date | null;
  payments?: Array<{
    amount: number | string;
    status: string;
  }>;
}

export type ClassifiedStatus = "PAID" | "OVERDUE" | "PARTIALLY_PAID" | "DUE" | "UNBILLED";

export interface ClassifiedCell {
  status: ClassifiedStatus;
  label: string; // B&W status word: Paid, Due, Part · due Rs X, OVERDUE, -
  totalAmount: number;
  paidAmount: number;
  outstanding: number;
  isOverdue: boolean;
  effectiveDueDate: Date | null;
  daysOverdue: number;
}

/**
 * Effective due date rule (App v1.12.0):
 * - Monthly bills: 7th of the bill's own month/year at 23:59:59.
 * - Non-monthly (Bed Fee / Establishment Fee): bill.dueDate or +14 days fallback.
 */
export function effectiveDueDate(bill: BillLike | null | undefined): Date | null {
  if (!bill) return null;
  const month = Number(bill.month);
  const year = Number(bill.year);

  if (month >= 1 && month <= 12 && year > 0) {
    return new Date(year, month - 1, 7, 23, 59, 59, 999);
  }

  if (bill.dueDate) {
    const d = new Date(bill.dueDate);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

/**
 * Calculates bill financial totals and current outstanding balance.
 * ₹0 placeholder bills are never due and have 0 outstanding.
 */
export function getBillAmounts(bill: BillLike | null | undefined) {
  if (!bill) {
    return { totalAmount: 0, paidAmount: 0, outstanding: 0 };
  }

  const rawTotal = bill.totalAmount ?? bill.amount ?? bill.rentAmount ?? 0;
  const totalAmount = Math.max(0, Number(rawTotal) || 0);

  if (totalAmount <= 0) {
    return { totalAmount: 0, paidAmount: 0, outstanding: 0 };
  }

  let paidAmount = 0;
  if (Array.isArray(bill.payments) && bill.payments.length > 0) {
    paidAmount = bill.payments.reduce((sum, p) => {
      const s = String(p.status || "").toUpperCase();
      if (s === "VERIFIED" || s === "APPROVED" || s === "PAID") {
        return sum + (Number(p.amount) || 0);
      }
      return sum;
    }, 0);
  } else {
    paidAmount = Number(bill.paidAmount) || 0;
  }

  // If status is explicitly PAID, full total is satisfied
  if (bill.status === "PAID") {
    paidAmount = Math.max(paidAmount, totalAmount);
  }

  const outstanding = Math.max(0, totalAmount - paidAmount);
  return { totalAmount, paidAmount, outstanding };
}

/**
 * Evaluates whether a bill is OVERDUE (App v1.12.0 7th-rule):
 * True if today is past the 7th of the bill's month and money is still owed,
 * regardless of stored server status/dueDate.
 */
export function billIsOverdue(bill: BillLike | null | undefined, asOfDate: Date = new Date()): boolean {
  if (!bill) return false;
  const { totalAmount, outstanding } = getBillAmounts(bill);
  if (totalAmount <= 0 || outstanding <= 0) return false;
  if (bill.status === "PAID") return false;
  if (bill.status === "OVERDUE") return true;

  const due = effectiveDueDate(bill);
  if (due && asOfDate.getTime() > due.getTime()) {
    return true;
  }

  return false;
}

/**
 * Classifies a bill for display in UI, CSV, and PDF exports.
 */
export function classifyBill(bill: BillLike | null | undefined, asOfDate: Date = new Date()): ClassifiedCell {
  if (!bill || bill.status === "NOT_BILLED") {
    return {
      status: "UNBILLED",
      label: "-",
      totalAmount: 0,
      paidAmount: 0,
      outstanding: 0,
      isOverdue: false,
      effectiveDueDate: null,
      daysOverdue: 0,
    };
  }

  const { totalAmount, paidAmount, outstanding } = getBillAmounts(bill);
  const due = effectiveDueDate(bill);

  if (totalAmount <= 0) {
    if (bill.status === "PAID") {
      return {
        status: "PAID",
        label: "Paid",
        totalAmount: 0,
        paidAmount: 0,
        outstanding: 0,
        isOverdue: false,
        effectiveDueDate: due,
        daysOverdue: 0,
      };
    }
    return {
      status: "UNBILLED",
      label: "-",
      totalAmount: 0,
      paidAmount: 0,
      outstanding: 0,
      isOverdue: false,
      effectiveDueDate: null,
      daysOverdue: 0,
    };
  }

  if (outstanding <= 0 || bill.status === "PAID") {
    return {
      status: "PAID",
      label: "Paid",
      totalAmount,
      paidAmount: totalAmount,
      outstanding: 0,
      isOverdue: false,
      effectiveDueDate: due,
      daysOverdue: 0,
    };
  }

  const overdue = billIsOverdue(bill, asOfDate);
  const daysOverdue = overdue && due
    ? Math.max(1, Math.floor((asOfDate.getTime() - due.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;

  if (overdue) {
    return {
      status: "OVERDUE",
      label: "OVERDUE",
      totalAmount,
      paidAmount,
      outstanding,
      isOverdue: true,
      effectiveDueDate: due,
      daysOverdue,
    };
  }

  if (paidAmount > 0) {
    return {
      status: "PARTIALLY_PAID",
      label: `Part · due Rs ${Math.round(outstanding)}`,
      totalAmount,
      paidAmount,
      outstanding,
      isOverdue: false,
      effectiveDueDate: due,
      daysOverdue: 0,
    };
  }

  return {
    status: "DUE",
    label: "Due",
    totalAmount,
    paidAmount: 0,
    outstanding,
    isOverdue: false,
    effectiveDueDate: due,
    daysOverdue: 0,
  };
}

/**
 * Classifies standalone annual fees (Bed Fee / Establishment Fee).
 * Prints "Paid" or "unpaid" for B&W PDF clarity (App v1.13.2).
 */
export function classifyFee(
  feeOrAmount: { amount?: number; status?: string } | number | null | undefined,
  feeStatus?: string
): {
  isPaid: boolean;
  status: "PAID" | "OVERDUE" | "DUE" | "UNBILLED";
  label: string;
  amount: number;
} {
  const amt = typeof feeOrAmount === "number" ? feeOrAmount : Number(feeOrAmount?.amount || 0);
  const st = typeof feeOrAmount === "object" && feeOrAmount ? feeOrAmount.status : feeStatus;
  if (!st || st === "NOT_BILLED" || amt <= 0) {
    return { isPaid: false, status: "UNBILLED", label: "-", amount: 0 };
  }
  const isPaid = st === "PAID";
  const isOverdue = st === "OVERDUE";
  return {
    isPaid,
    status: isPaid ? "PAID" : isOverdue ? "OVERDUE" : "DUE",
    label: isPaid ? "Paid" : "unpaid",
    amount: amt,
  };
}

/**
 * Format currency for jsPDF (where standard fonts have no ₹ glyph).
 */
export function formatCurrencyRs(val: number | string | null | undefined): string {
  const num = Math.round(Number(val) || 0);
  return `Rs ${num.toLocaleString("en-IN")}`;
}

export const MONTH_NAMES_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_NAMES_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];
