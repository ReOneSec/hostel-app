import { Resend } from "resend";
import { prisma } from "./prisma";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM_EMAIL = "Mirror Hostels <noreply@mirrorhostels.com>";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  userId?: string;
  type?: string;
}

/**
 * Send an email and log it to the Notification table
 */
export async function sendEmail({
  to,
  subject,
  html,
  userId,
  type = "EMAIL",
}: SendEmailOptions): Promise<boolean> {
  try {
    let finalTo = to;
    if (userId) {
      const userProfile = await prisma.studentProfile.findUnique({ where: { userId } });
      if (userProfile?.personalEmail) {
        finalTo = userProfile.personalEmail;
      }
    }

    // In development, just log the email
    if (process.env.NODE_ENV === "development") {
      console.log(`[Email] To: ${to}, Subject: ${subject}`);
      console.log(`[Email] Body preview: ${html.substring(0, 200)}...`);
    }

    // Only actually send in production (or if RESEND_API_KEY is set to a real key)
    if (
      process.env.RESEND_API_KEY &&
      !process.env.RESEND_API_KEY.startsWith("re_your")
    ) {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: finalTo,
        subject,
        html,
      });
    }

    // Log to Notification table
    if (userId) {
      await prisma.notification.create({
        data: {
          userId,
          type,
          title: subject,
          message: html.replace(/<[^>]*>/g, "").substring(0, 500),
          emailSent: true,
        },
      });
    }

    return true;
  } catch (error) {
    console.error("[Email] Failed to send email:", error);
    return false;
  }
}

// ─── Email Templates ────────────────────────────────────────

export function welcomeEmail(username: string, tempPassword: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to Mirror Hostels</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${username}</strong>,</p>
        <p>Your account has been created. Here are your login credentials:</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Username:</strong> ${username}</p>
          <p style="margin: 4px 0;"><strong>Temporary Password:</strong> ${tempPassword}</p>
        </div>
        <p style="color: #e74c3c;"><strong>Please change your password after your first login.</strong></p>
        <p>You'll be asked to complete your profile on first login.</p>
      </div>
    </div>
  `;
}

export function billGeneratedEmail(
  name: string,
  month: string,
  year: number,
  total: string
): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Monthly Bill Generated</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your bill for <strong>${month} ${year}</strong> has been generated.</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #667eea; margin: 16px 0;">
          <p style="margin: 4px 0; font-size: 20px;"><strong>Total Due: ₹${total}</strong></p>
        </div>
        <p>Please log in to view the full breakdown and upload payment proof.</p>
      </div>
    </div>
  `;
}

export function paymentStatusEmail(
  name: string,
  status: "APPROVED" | "REJECTED",
  amount: string,
  reason?: string
): string {
  const isApproved = status === "APPROVED";
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, ${isApproved ? "#27ae60, #2ecc71" : "#e74c3c, #c0392b"}); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Payment ${isApproved ? "Approved ✅" : "Rejected ❌"}</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your payment of <strong>₹${amount}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
        ${reason ? `<p style="color: #e74c3c;"><strong>Reason:</strong> ${reason}</p>` : ""}
        ${!isApproved ? "<p>Please re-upload your payment proof with the correct details.</p>" : ""}
      </div>
    </div>
  `;
}

export function documentStatusEmail(
  name: string,
  status: "APPROVED" | "REJECTED",
  documentType: string,
  reason?: string
): string {
  const isApproved = status === "APPROVED";
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, ${isApproved ? "#27ae60, #2ecc71" : "#e74c3c, #c0392b"}); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Document ${isApproved ? "Approved ✅" : "Rejected ❌"}</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your document (<strong>${documentType}</strong>) has been <strong>${status.toLowerCase()}</strong>.</p>
        ${reason ? `<p style="color: #e74c3c;"><strong>Reason:</strong> ${reason}</p>` : ""}
        ${!isApproved ? "<p>Please log in and upload a valid document.</p>" : ""}
      </div>
    </div>
  `;
}

export function messSettlementEmail(
  name: string,
  month: string,
  year: number,
  mealCount: number,
  totalLiability: string,
  totalContribution: string,
  netSettlement: string
): string {
  const isRefund = parseFloat(netSettlement) >= 0;
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #f39c12 0%, #d35400 100%); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Mess Settlement: ${month} ${year}</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>The mess session for <strong>${month} ${year}</strong> has been successfully closed. Here is your summary:</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #f39c12; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Meals Consumed:</strong> ${mealCount}</p>
          <p style="margin: 4px 0;"><strong>Total Contribution:</strong> ₹${totalContribution}</p>
          <p style="margin: 4px 0;"><strong>Total Cost:</strong> ₹${totalLiability}</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 12px 0;" />
          <p style="margin: 4px 0; font-size: 18px;"><strong>Net Settlement: <span style="color: ${isRefund ? '#27ae60' : '#e74c3c'};">${isRefund ? '+' : ''}₹${netSettlement}</span></strong></p>
        </div>
        <p>This amount will be automatically adjusted in your upcoming bill or refund pool.</p>
      </div>
    </div>
  `;
}

export function transferEmail(
  name: string,
  hostelName: string,
  roomNumber: string,
  bedLabel: string
): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #3498db 0%, #2980b9 100%); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Hostel Transfer Complete 🔄</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your transfer has been successfully processed. Here are your new details:</p>
        <div style="background: white; padding: 16px; border-radius: 8px; border-left: 4px solid #3498db; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Hostel:</strong> ${hostelName}</p>
          <p style="margin: 4px 0;"><strong>Room:</strong> ${roomNumber}</p>
          <p style="margin: 4px 0;"><strong>Bed:</strong> ${bedLabel}</p>
        </div>
        <p style="color: #e74c3c;"><strong>Important:</strong> As part of our security protocol, you are required to upload a new selfie from your new location. Please log in to complete this step.</p>
      </div>
    </div>
  `;
}

export function profileIncompleteEmail(name: string): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #e67e22 0%, #d35400 100%); padding: 32px; border-radius: 12px 12px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">Complete Your Profile 📋</h1>
      </div>
      <div style="background: #f8f9fa; padding: 32px; border-radius: 0 0 12px 12px;">
        <p>Hello <strong>${name}</strong>,</p>
        <p>We noticed that you haven't completed your profile yet. Please log in to the Mirror Hostels portal to complete your registration, which includes uploading your documents and capturing your security selfie.</p>
        <p>You will not be able to access your dashboard or mess features until your profile is complete.</p>
      </div>
    </div>
  `;
}
