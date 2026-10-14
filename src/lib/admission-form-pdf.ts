import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "@/lib/api-response";

export type AdmissionFormAssets = {
  selfieDataUrl: string | null;
  qrDataUrl: string;
  attachmentDataUrls: Map<string, string>;
};

export type AdmissionFormUser = any;

export function getBaseUrl(): string {
  const value = process.env.APP_BASE_URL?.trim().replace(/\/$/, "");
  if (!value) throw new Error("APP_BASE_URL is not configured");
  return value;
}

export function admissionFormFilename(user: any): string {
  const raw = user?.studentProfile?.fullName || user?.username || "Student";
  const safe = raw
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_.-]/g, "")
    .replace(/^\.+/, "") || "Student";
  return `Admission_Form_${safe}.pdf`;
}

export function admissionFormHeaders(user: any, contentLength: number): HeadersInit {
  return {
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename="${admissionFormFilename(user)}"`,
    "Content-Length": String(contentLength),
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
  };
}

export function admissionFormErrorResponse(error: any) {
  console.error("[Admission Form Error]", error?.message || "Generation error");
  return errorResponse(
    "Failed to generate admission form PDF",
    500,
    "PDF_GENERATION_FAILED"
  );
}

export function isEmbeddableImage(docItem: any): boolean {
  if (!docItem?.fileUrl) return false;
  const url = docItem.fileUrl.toLowerCase();
  const name = (docItem.fileName || "").toLowerCase();
  if (url.endsWith(".pdf") || name.endsWith(".pdf")) return false;
  return true;
}

export async function imageUrlToDataUrl(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Image fetch failed: ${res.status}`);
  const mime = (res.headers.get("content-type") || "image/jpeg")
    .split(";", 1)[0].toLowerCase();
  if (mime !== "image/jpeg" && mime !== "image/png") {
    throw new Error(`Unsupported image type: ${mime}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export async function loadAdmissionFormUser(targetUserId: string) {
  return await prisma.user.findUnique({
    where: { id: targetUserId },
    include: {
      studentProfile: true,
      hostelAssignments: {
        where: { status: "ACTIVE" },
        include: { hostel: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
      roomAssignments: {
        where: { status: "ACTIVE" },
        include: { room: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
      bedAssignments: {
        where: { status: "ACTIVE" },
        include: { bed: true },
        orderBy: { assignedAt: "desc" },
        take: 1,
      },
      selfies: {
        where: { isCurrent: true },
        orderBy: { capturedAt: "desc" },
        take: 1,
      },
      documents: { orderBy: { uploadedAt: "desc" } },
    },
  });
}

export async function loadAdmissionFormAssetsOnServer(user: any): Promise<AdmissionFormAssets> {
  const verifyUrl = `${getBaseUrl()}/verify/${user.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 200, margin: 1 });

  const selfieUrl = user.selfies?.find((s: any) => s.isCurrent)?.fileUrl || user.selfies?.[0]?.fileUrl;
  const imageDocs = (user.documents || []).filter(isEmbeddableImage);

  const results = await Promise.allSettled([
    selfieUrl ? imageUrlToDataUrl(selfieUrl) : Promise.resolve(null),
    ...imageDocs.map((doc: any) => imageUrlToDataUrl(doc.fileUrl)),
  ]);

  const selfieResult = results[0];
  const selfieDataUrl = selfieResult.status === "fulfilled" ? selfieResult.value : null;

  const attachmentDataUrls = new Map<string, string>();
  imageDocs.forEach((doc: any, index: number) => {
    const itemResult = results[index + 1];
    if (itemResult.status === "fulfilled" && itemResult.value) {
      attachmentDataUrls.set(doc.id, itemResult.value);
    }
  });

  return {
    selfieDataUrl,
    qrDataUrl,
    attachmentDataUrls,
  };
}

export async function buildAdmissionFormPDF(
  user: AdmissionFormUser,
  assets: AdmissionFormAssets
): Promise<jsPDF> {
  const doc = new jsPDF();
  const profile = user.studentProfile || {};
  const hostelAssign = user.hostelAssignments?.[0];
  const roomAssign = user.roomAssignments?.[0];
  const bedAssign = user.bedAssignments?.[0];

  const { selfieDataUrl, qrDataUrl, attachmentDataUrls } = assets;

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
    doc.addImage(qrDataUrl, "PNG", 178, 12, 18, 18);
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
    const formatType = selfieDataUrl.toString().includes("image/png") ? "PNG" : "JPEG";
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

    const isPdf = docItem.fileUrl.toLowerCase().endsWith(".pdf") || docItem.fileName?.toLowerCase().endsWith(".pdf");
    if (isPdf) continue;

    const base64 = attachmentDataUrls?.get(docItem.id);
    if (!base64) continue;

    const formatType = base64.includes("image/png") ? "PNG" : "JPEG";

    doc.addPage();
    doc.setFontSize(14);
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setFont("helvetica", "bold");
    doc.text(`ATTACHMENT: ${docItem.documentType.replace(/_/g, " ")}`, 105, 20, { align: "center" });
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

  return doc;
}
