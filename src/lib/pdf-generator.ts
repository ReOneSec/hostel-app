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

  // Header
  doc.setFontSize(24);
  doc.setTextColor(41, 128, 185);
  doc.setFont("helvetica", "bold");
  doc.text("MIRROR HOSTELS", 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(108, 117, 125);
  doc.setFont("helvetica", "normal");
  doc.text("ADMISSION & AGREEMENT FORM", 105, 27, { align: "center" });

  doc.setFontSize(10);
  doc.setTextColor(33, 37, 41);
  doc.text(`Ref No: ${appNumber}`, 196, 20, { align: "right" });
  doc.text(`Generated: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 196, 25, { align: "right" });

  if (qrDataUrl) {
    doc.addImage(qrDataUrl, 'PNG', 14, 10, 20, 20);
  }

  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(1);
  doc.line(14, 32, 196, 32);

  // Profile Image Box
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(160, 40, 35, 45);
  if (selfieDataUrl) {
    const formatType = selfieDataUrl.toString().includes('image/png') ? 'PNG' : 'JPEG';
    doc.addImage(selfieDataUrl, formatType, 160, 40, 35, 45);
    doc.rect(160, 40, 35, 45);
  } else {
    doc.setFontSize(9);
    doc.setTextColor(150, 150, 150);
    doc.text("Passport Size\nPhoto", 177.5, 62, { align: "center" });
  }

  const personalDetails = [
    ["Full Name", profile.fullName || user.username || "N/A"],
    ["Date of Birth", profile.dob || profile.dateOfBirth ? format(new Date(profile.dob || profile.dateOfBirth), "MMM d, yyyy") : "N/A"],
    ["Gender", profile.gender || "N/A"],
    ["Aadhaar Number", profile.aadhaarNumber || "N/A"],
    ["Mobile Number", profile.mobile || "N/A"],
    ["Email Address", profile.personalEmail || user.email || "N/A"]
  ];

  autoTable(doc, {
    startY: 40,
    head: [["PERSONAL DETAILS", ""]],
    body: personalDetails,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [245, 247, 250] }, 1: { cellWidth: 95 } },
    margin: { left: 14 }
  });

  let finalY = (doc as any).lastAutoTable.finalY + 10;

  const medicalDetails = [
    ["Blood Group", profile.bloodGroup || "N/A"],
    ["Chronic Illnesses", profile.chronicIllnesses || "None reported"],
    ["Allergies", profile.allergies || "None reported"],
    ["Regular Medications", profile.regularMedications || "None reported"],
  ];

  autoTable(doc, {
    startY: finalY,
    head: [["MEDICAL & SAFETY DETAILS", ""]],
    body: medicalDetails,
    theme: "grid",
    headStyles: { fillColor: [231, 76, 60], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [253, 237, 236] }, 1: { cellWidth: 142 } },
    margin: { left: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  const guardianDetails = [
    ["Father's Name", profile.fatherName || "N/A"],
    ["Mother's Name", profile.motherName || "N/A"],
    ["Guardian Name", profile.guardianName || "N/A"],
    ["Relationship", profile.guardianRelation || "N/A"],
    ["Guardian Mobile", profile.guardianMobile || profile.parentMobile || "N/A"],
    ["Emergency Contact", profile.emergencyContactName ? `${profile.emergencyContactName} (${profile.emergencyContactNumber})` : (profile.emergencyContact || "N/A")]
  ];

  autoTable(doc, {
    startY: finalY,
    head: [["GUARDIAN DETAILS", ""]],
    body: guardianDetails,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [245, 247, 250] }, 1: { cellWidth: 142 } },
    margin: { left: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  autoTable(doc, {
    startY: finalY,
    head: [["ADDRESS DETAILS", ""]],
    body: [
      ["Permanent Address", profile.permanentAddress || profile.address || "N/A"]
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [245, 247, 250] }, 1: { cellWidth: 142 } },
    margin: { left: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  const accomDetails = [
    ["Hostel Name", hostelAssign?.hostel?.name || "Not Assigned"],
    ["Hostel Contact", hostelAssign?.hostel?.contactNumber || "N/A"],
    ["Hostel Address", hostelAssign?.hostel?.address || "N/A"],
    ["Room Number", roomAssign?.room?.roomNumber || "Not Assigned"],
    ["Bed Label", bedAssign?.bed?.bedLabel || "Not Assigned"],
    ["Joining Date", user.joiningDate || profile.completedAt || user.createdAt ? format(new Date(user.joiningDate || profile.completedAt || user.createdAt), "MMM d, yyyy") : "N/A"]
  ];

  autoTable(doc, {
    startY: finalY,
    head: [["ACCOMMODATION DETAILS", ""]],
    body: accomDetails,
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [245, 247, 250] }, 1: { cellWidth: 142 } },
    margin: { left: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 10;

  const feeDetails = [
    ["Security Deposit", "As per standard hostel policy"],
    ["Monthly Rent", "As per assigned room configuration"],
    ["Establishment Fees", "Applicable as per assignment"],
  ];

  autoTable(doc, {
    startY: finalY,
    head: [["FINANCIAL AGREEMENT", ""]],
    body: feeDetails,
    theme: "grid",
    headStyles: { fillColor: [39, 174, 96], textColor: [255, 255, 255] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, fillColor: [234, 250, 241] }, 1: { cellWidth: 142 } },
    margin: { left: 14 }
  });

  finalY = (doc as any).lastAutoTable.finalY + 15;

  // Legal Terms
  doc.setFontSize(12);
  doc.setTextColor(41, 128, 185);
  doc.setFont("helvetica", "bold");
  doc.text("TERMS AND CONDITIONS", 105, finalY, { align: "center" });
  doc.setFont("helvetica", "normal");
  finalY += 8;

  doc.setFontSize(9);
  doc.setTextColor(33, 37, 41);
  const terms = [
    "1. I agree to abide by all the rules and regulations of the hostel, which may be amended from time to time.",
    "2. Anti-Ragging Undertaking: I understand that Mirror Hostels has a zero-tolerance policy towards ragging, harassment, and the use of alcohol/illegal substances.",
    "3. I understand that the hostel fees and mess charges must be paid on or before the due date, failing which late fees may apply.",
    "4. I shall be held responsible for any damage caused to hostel property by me, and I agree to bear the cost of repair or replacement.",
    "5. I understand that the hostel management reserves the right to terminate my accommodation in case of any misconduct or violation of rules.",
    "6. Privacy Consent: I hereby declare that all information provided is true and I consent to the storage and processing of my data."
  ];

  terms.forEach(term => {
    const termLines = doc.splitTextToSize(term, 180);
    if (finalY + (termLines.length * 5) > 270) {
      doc.addPage();
      finalY = 20;
    }
    doc.text(termLines, 14, finalY);
    finalY += (termLines.length * 5) + 2;
  });

  // Consent timestamp highlighted
  finalY += 4;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(39, 174, 96); // Green color for verification
  const consentDate = user.privacyConsentAt ? format(new Date(user.privacyConsentAt), "MMM d, yyyy HH:mm:ss") : format(new Date(user.createdAt || new Date()), "MMM d, yyyy HH:mm:ss");
  doc.text(`Digital Consent Of The Student Given On: ${consentDate}`, 14, finalY);

  doc.setTextColor(33, 37, 41);
  doc.setFont("helvetica", "normal");

  // Signatures section
  finalY += 20;
  if (finalY > 260) {
    doc.addPage();
    finalY = 40;
  }

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("_________________________", 20, finalY);
  doc.text("Student Signature", 30, finalY + 6);

  doc.setFontSize(10);
  doc.text("_________________________", 85, finalY);
  doc.text("Guardian Signature", 93, finalY + 6);

  doc.setTextColor(39, 174, 96);
  doc.setFontSize(8);
  doc.text("[ DIGITAL VERIFIED ]", 172, finalY - 2, { align: "center" });
  doc.setTextColor(33, 37, 41);
  doc.setFontSize(10);
  doc.text("_________________________", 150, finalY);
  doc.text("Hostel Authority", 158, finalY + 6);

  finalY += 45;
  if (finalY > 260) {
    doc.addPage();
    finalY = 40;
  }

  const approvedDocs = user.documents?.filter((d: any) => d.status === "VERIFIED" || d.status === "APPROVED") || [];

  let verifierName = "Pending Verification";
  let verifiedDate = "Pending Verification";

  if (approvedDocs.length > 0) {
    const latestVerifiedDoc = [...approvedDocs].sort((a: any, b: any) => new Date(b.verifiedAt || b.uploadedAt || 0).getTime() - new Date(a.verifiedAt || a.uploadedAt || 0).getTime())[0];
    verifierName = latestVerifiedDoc?.verifierName || "System Admin (Legacy)";
    const dateToUse = latestVerifiedDoc?.verifiedAt || latestVerifiedDoc?.uploadedAt;
    verifiedDate = dateToUse ? format(new Date(dateToUse), "MMM d, yyyy HH:mm") : "Prior to Update";
  }

  // Office Use Only Section
  doc.setDrawColor(200, 200, 200);
  doc.setFillColor(250, 250, 250);
  doc.rect(14, finalY, 182, 30, "FD");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("FOR OFFICE USE ONLY", 105, finalY + 8, { align: "center" });
  doc.line(14, finalY + 11, 196, finalY + 11);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("System Status: [ APPROVED & VERIFIED ]", 20, finalY + 19);
  doc.text(`Date of Verification: ${verifiedDate}`, 20, finalY + 27);
  doc.text(`Verified By: ${verifierName}`, 110, finalY + 19);

  for (const docItem of approvedDocs) {
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
      doc.setTextColor(41, 128, 185);
      doc.setFont("helvetica", "bold");
      doc.text(`ATTACHMENT: ${docItem.documentType.replace(/_/g, ' ')}`, 105, 20, { align: "center" });
      doc.setDrawColor(41, 128, 185);
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

  // Add Watermarks and Footers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Watermark
    doc.saveGraphicsState();
    doc.setGState(new (doc as any).GState({ opacity: 0.25 }));
    doc.setTextColor(200, 200, 200);
    doc.setFontSize(60);
    doc.setFont("helvetica", "bold");
    // jsPDF text rotation
    doc.text("MIRROR HOSTELS", 105, 150, { align: "center", angle: 45 });
    doc.restoreGraphicsState();

    // Footer
    doc.setTextColor(150, 150, 150);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${pageCount}`, 105, 290, { align: "center" });
    doc.text(`Student: ${profile.fullName || user.username} | ID: ${user.id.slice(-6)}`, 14, 290);
  }

  // Save
  doc.save(`Admission_Form_${(profile.fullName || user.username || "Student").replace(/\s+/g, '_')}.pdf`);
}

