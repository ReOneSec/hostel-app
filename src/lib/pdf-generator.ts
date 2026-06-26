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

