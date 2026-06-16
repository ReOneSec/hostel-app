import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";

export function generateInvoicePDF(bill: any, userProfile?: any) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(33, 37, 41);
  doc.text("MIRROR HOSTELS", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Hostel Fee Invoice", 14, 28);
  
  // Bill Meta
  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  doc.text(`Invoice No: ${bill.id.slice(-8).toUpperCase()}`, 140, 22);
  doc.text(`Date: ${format(new Date(bill.generatedAt), "MMM d, yyyy")}`, 140, 28);
  doc.text(`Due Date: ${format(new Date(bill.dueDate), "MMM d, yyyy")}`, 140, 34);

  // Billed To
  doc.setFontSize(12);
  doc.text("Billed To:", 14, 45);
  doc.setFontSize(10);
  doc.text(userProfile?.fullName || bill.user?.username || "Student", 14, 51);
  doc.text(bill.user?.email || "", 14, 57);
  doc.text(`Hostel: ${bill.hostel?.name || "N/A"}`, 14, 63);

  // Table Data
  const tableData = [
    ["Room Rent", `Rs. ${bill.rentAmount}`],
    ["Bed Fee", `Rs. ${bill.bedFee}`],
    ["Establishment Fee", `Rs. ${bill.establishmentFee}`],
    ["Mess Charge", `Rs. ${bill.messCharge}`],
  ];

  if (Number(bill.lateFee) > 0) {
    tableData.push(["Late Fee", `Rs. ${bill.lateFee}`]);
  }

  // Draw Table
  autoTable(doc, {
    startY: 75,
    head: [["Description", "Amount"]],
    body: tableData,
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] },
    foot: [["Total Amount", `Rs. ${bill.totalAmount}`]],
    footStyles: { fillColor: [241, 245, 249], textColor: [0, 0, 0], fontStyle: "bold" },
  });

  // Payment Status
  const finalY = (doc as any).lastAutoTable.finalY || 150;
  doc.setFontSize(10);
  if (bill.status === "PAID") {
    doc.setTextColor(39, 174, 96);
    doc.text(`Status: PAID (Rs. ${bill.paidAmount})`, 14, finalY + 15);
  } else {
    doc.setTextColor(231, 76, 60);
    doc.text(`Status: ${bill.status} (Pending: Rs. ${Number(bill.totalAmount) - Number(bill.paidAmount)})`, 14, finalY + 15);
  }

  doc.setTextColor(108, 117, 125);
  doc.text("Thank you for choosing Mirror Hostels.", 14, finalY + 30);

  // Save
  doc.save(`Invoice_${bill.id.slice(-8)}.pdf`);
}

export function generateReceiptPDF(payment: any) {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(22);
  doc.setTextColor(33, 37, 41);
  doc.text("MIRROR HOSTELS", 14, 22);
  
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("Payment Receipt", 14, 28);
  
  // Receipt Meta
  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  doc.text(`Receipt No: ${payment.id.slice(-8).toUpperCase()}`, 140, 22);
  doc.text(`Date: ${format(new Date(payment.verifiedAt || payment.submittedAt), "MMM d, yyyy")}`, 140, 28);
  doc.text(`Status: ${payment.status}`, 140, 34);

  // Received From
  doc.setFontSize(12);
  doc.text("Received From:", 14, 45);
  doc.setFontSize(10);
  doc.text(payment.user?.studentProfile?.fullName || payment.user?.username || "Student", 14, 51);
  doc.text(payment.user?.email || "", 14, 57);

  // Payment Details
  autoTable(doc, {
    startY: 65,
    head: [["Detail", "Information"]],
    body: [
      ["Amount Paid", `Rs. ${payment.amount}`],
      ["Payment Date", format(new Date(payment.paymentDate), "MMM d, yyyy")],
      ["Transaction ID", payment.transactionId || "N/A"],
      ["UTR Number", payment.utrNumber || "N/A"],
      ["For Bill ID", payment.billId.slice(-8).toUpperCase()],
    ],
    theme: "grid",
    headStyles: { fillColor: [39, 174, 96] },
  });

  const finalY = (doc as any).lastAutoTable.finalY || 150;
  
  doc.setFontSize(10);
  doc.setTextColor(108, 117, 125);
  doc.text("This is an electronically generated receipt.", 14, finalY + 20);

  // Save
  doc.save(`Receipt_${payment.id.slice(-8)}.pdf`);
}
