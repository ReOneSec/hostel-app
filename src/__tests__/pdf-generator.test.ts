import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSave = vi.fn();
const mockText = vi.fn();
const mockSetFontSize = vi.fn();
const mockSetTextColor = vi.fn();
const mockSetFillColor = vi.fn();
const mockSetDrawColor = vi.fn();
const mockSetLineWidth = vi.fn();
const mockLine = vi.fn();
const mockRect = vi.fn();
const mockRoundedRect = vi.fn();
const mockSetFont = vi.fn();

const mockConstructor = vi.fn();

vi.mock('jspdf', () => {
  return {
    default: class MockJsPDF {
      constructor(options: any) {
        mockConstructor(options);
      }
      save = mockSave;
      text = mockText;
      setFontSize = mockSetFontSize;
      setTextColor = mockSetTextColor;
      setFillColor = mockSetFillColor;
      setDrawColor = mockSetDrawColor;
      setLineWidth = mockSetLineWidth;
      line = mockLine;
      rect = mockRect;
      roundedRect = mockRoundedRect;
      setFont = mockSetFont;
      lastAutoTable = { finalY: 120 };
    },
  };
});

vi.mock('jspdf-autotable', () => {
  return {
    default: vi.fn((doc, options) => {
      doc.lastAutoTable = { finalY: 130 };
    }),
  };
});

import { generateInvoicePDF, generateReceiptPDF } from '@/lib/pdf-generator';
import autoTable from 'jspdf-autotable';

describe('PDF Generator - Recommended Design Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('generates an A4 portrait invoice with "Not Available" for missing payment date and UTR', () => {
    const mockBill = {
      id: 'cmv3yyjai00976a7ovlox9l4h',
      rentAmount: 0,
      bedFee: 500,
      establishmentFee: 1000,
      messCharge: 0,
      lateFee: 0,
      totalAmount: 1500,
      paidAmount: 0,
      status: 'GENERATED',
      dueDate: new Date(2026, 9, 18),
      generatedAt: new Date(2026, 9, 11),
      month: 10,
      year: 2026,
      hostel: { name: 'AFREEN MANZIL' },
      user: {
        username: 'MD RAHAMAN SK',
        email: 'mdrahamansk@mirror.std',
        studentProfile: { fullName: 'MD RAHAMAN SK' },
      },
    };

    generateInvoicePDF(mockBill);

    expect(mockConstructor).toHaveBeenCalledWith({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    expect(mockSetTextColor).toHaveBeenCalledWith(20, 45, 78);
    expect(mockText).toHaveBeenCalledWith('MIRROR HOSTELS', 20, 22);

    // Verify "Not Available" is rendered for Payment Paid and UTR Number
    expect(mockText).toHaveBeenCalledWith('Payment Paid:', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('UTR Number:', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('Not Available', expect.any(Number), expect.any(Number));

    expect(mockSave).toHaveBeenCalledWith('Invoice_VLOX9L4H.pdf');
  });

  it('generates an invoice displaying actual Payment Paid date and UTR Number when available', () => {
    const mockBill = {
      id: 'cmv3yyjai00976a7ovlox9l4h',
      rentAmount: 0,
      bedFee: 500,
      establishmentFee: 1000,
      messCharge: 0,
      lateFee: 0,
      totalAmount: 1500,
      paidAmount: 1500,
      status: 'PAID',
      dueDate: new Date(2026, 9, 18),
      generatedAt: new Date(2026, 9, 11),
      month: 10,
      year: 2026,
      paidDate: new Date(2026, 9, 11),
      utrNumber: 'UTR9847192837',
      hostel: { name: 'AFREEN MANZIL' },
      user: {
        username: 'MD RAHAMAN SK',
        email: 'mdrahamansk@mirror.std',
        studentProfile: { fullName: 'MD RAHAMAN SK' },
      },
    };

    generateInvoicePDF(mockBill);

    // Verify actual payment paid date and UTR number are displayed
    expect(mockText).toHaveBeenCalledWith('Payment Paid:', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('Oct 11, 2026', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('UTR Number:', expect.any(Number), expect.any(Number));
    expect(mockText).toHaveBeenCalledWith('UTR9847192837', expect.any(Number), expect.any(Number));

    expect(mockSave).toHaveBeenCalledWith('Invoice_VLOX9L4H.pdf');
  });

  it('generates receipt PDF with the same brand design system', () => {
    const mockPayment = {
      id: 'pay12345678',
      amount: 1500,
      paymentDate: new Date(2026, 9, 11),
      status: 'VERIFIED',
      billId: 'cmv3yyjai00976a7ovlox9l4h',
      user: {
        email: 'student@example.com',
        studentProfile: { fullName: 'Test Student' },
      },
    };

    generateReceiptPDF(mockPayment);

    expect(mockConstructor).toHaveBeenCalledWith({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    expect(mockSave).toHaveBeenCalledWith('Receipt_12345678.pdf');
  });
});
