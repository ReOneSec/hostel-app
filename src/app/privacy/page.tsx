import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Privacy Policy | Mirror Mess",
  description:
    "Privacy Policy for Mirror Mess hostel management mobile app and website.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#F0F4F8] text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900 text-sm sm:text-base">Mirror Hostels</span>
              <span className="text-slate-300 hidden sm:inline">•</span>
              <span className="text-xs text-slate-500 hidden sm:inline">Legal</span>
            </div>
          </Link>

          <nav className="flex items-center gap-2">
            <Link
              href="/privacy"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors ml-1"
            >
              Sign In
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-8">
          {/* Title Header */}
          <div className="border-b border-slate-200 pb-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Privacy Policy
            </h1>
            <p className="text-sm font-medium text-slate-600">
              Mirror Mess
            </p>
            <p className="text-xs text-slate-500 pt-2">
              Last updated: 19 October 2026
            </p>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            Mirror Mess (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) provides hostel management services through the Mirror Mess mobile app and website. This policy explains what personal data we collect, why, and what rights you have. If you do not agree with this policy, please do not use the app.
          </p>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">
              1. Data we collect
            </h2>
            <ul className="space-y-2 text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>
                <strong>Account data:</strong> your name, email address, and login credentials. Passwords are processed by our authentication provider and are never visible to us in plain text.
              </li>
              <li>
                <strong>Profile information you provide:</strong> full name, parents&apos; names, date of birth, gender, blood group, mobile numbers, personal email, permanent address, emergency contact, and any optional medical details (illnesses, allergies, medications) you choose to share.
              </li>
              <li>
                <strong>Identity documents:</strong> photos of the ID proofs you upload (such as Aadhaar, Voter ID, Passport, Driving Licence, or PAN card).
              </li>
              <li>
                <strong>Selfie and location:</strong> a selfie photo and your GPS location captured at the moment of capture, used to verify your identity and presence at the hostel.
              </li>
              <li>
                <strong>Payment information:</strong> UTR / transaction reference numbers and payment screenshots you submit. We do not collect bank account numbers, card numbers, or UPI PINs.
              </li>
              <li>
                <strong>Hostel records:</strong> your room and bed assignment, bills, invoices, and payment history generated during your stay.
              </li>
              <li>
                <strong>Device and technical data:</strong> push-notification token, app version, and device operating system, used to deliver notices and keep the app working.
              </li>
            </ul>
          </section>

          {/* Section 2 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              2. How we use your data
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We use your data only to operate the hostel service: managing your account and profile, verifying your identity, generating and tracking bills, verifying payments, and sending service notices (bills, announcements, and reminders). We do not use your data for advertising and we do not sell your personal data.
            </p>
          </section>

          {/* Section 3 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              3. Who can see your data
            </h2>
            <ul className="space-y-1.5 text-sm text-slate-700 leading-relaxed list-disc pl-5">
              <li>Administrators and managers of your hostel, for hostel administration.</li>
              <li>
                Service providers who process data on our behalf: secure server hosting and database, file storage, authentication services, and Firebase Cloud Messaging for push notifications. They may not use your data for their own purposes.
              </li>
              <li>We disclose data only where required by law.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              4. Data retention
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We keep your data while your hostel account is active and for a reasonable period afterwards for administrative records. You may request deletion of your data by contacting your hostel administrator.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              5. Your rights
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              You may request access to, correction of, or deletion of your personal data at any time through your hostel administrator or at the contact below. Profile corrections inside the app are sent to an administrator for approval.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              6. Security
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              Data is encrypted in transit (HTTPS). Access is restricted to authorised hostel staff. Image uploads are compressed on your device before sending.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              7. Children
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              The service is intended for hostel residents. If you are under 18, please ask a parent or guardian to complete your profile with you.
            </p>
          </section>

          {/* Section 8 */}
          <section className="space-y-2">
            <h2 className="text-base font-semibold text-slate-900">
              8. Changes to this policy
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              We may update this policy from time to time. Material changes will be notified through the app. Continued use of the app after changes take effect constitutes acceptance.
            </p>
          </section>

          {/* Section 9 */}
          <section className="space-y-2 pt-2 border-t border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              9. Contact
            </h2>
            <p className="text-sm text-slate-700 leading-relaxed">
              For privacy questions or requests, contact your hostel administrator or call us at{" "}
              <a
                href="tel:+918509568959"
                className="text-blue-600 hover:underline font-medium"
              >
                +91 85095 68959
              </a>
              .
            </p>
            <p className="text-sm text-slate-700 leading-relaxed">
              <strong className="text-slate-900 font-semibold">Developer &amp; Grievance Officer:</strong> Sahabaj Alam
              <br />
              Email:{" "}
              <a
                href="mailto:contactsahabaj@proton.me"
                className="text-blue-600 hover:underline font-medium"
              >
                contactsahabaj@proton.me
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Mirror Hostels. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="text-slate-900 font-medium">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-slate-800 transition-colors">
              Terms of Service
            </Link>
            <Link href="/download" className="hover:text-slate-800 transition-colors">
              Download App
            </Link>
            <Link href="/login" className="hover:text-slate-800 transition-colors">
              Portal Login
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
