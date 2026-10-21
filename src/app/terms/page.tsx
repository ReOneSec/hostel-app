import type { Metadata } from "next";
import Link from "next/link";
import { Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Terms of Service | Mirror Mess",
  description:
    "Terms of Service for Mirror Mess hostel management mobile app and services.",
};

export default function TermsOfServicePage() {
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
              className="text-xs font-medium text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-900"
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
        <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-10 space-y-6">
          {/* Title Header */}
          <div className="border-b border-slate-200 pb-6 space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Terms of Service
            </h1>
            <p className="text-sm font-medium text-slate-600">
              Mirror Mess
            </p>
            <p className="text-xs text-slate-500 pt-2">
              Last updated: 19 October 2026
            </p>
          </div>

          <p className="text-sm text-slate-700 leading-relaxed">
            These terms govern your use of the Mirror Mess mobile app and related services (&ldquo;the Service&rdquo;), provided for hostel residents and hostel staff. By creating an account or using the app, you agree to these terms.
          </p>

          {/* Terms items */}
          <div className="space-y-4 text-sm text-slate-700 leading-relaxed divide-y divide-slate-100">
            <div className="pt-3 first:pt-0">
              <strong className="text-slate-900 block font-semibold mb-1">The Service.</strong>
              Mirror Mess helps hostels manage residents, rooms, billing, payments, documents, and notices. Features may change over time as we improve the app.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Accounts.</strong>
              You are responsible for keeping your login credentials confidential and for all activity under your account. Notify your hostel administrator immediately if you believe your account has been misused.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Accurate information.</strong>
              You agree to provide true, complete, and up-to-date profile information, documents, and payment details. Your profile must be completed before you can use the app&apos;s features.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Documents and selfie.</strong>
              You confirm that the identity documents and selfie you upload are your own and are genuine. Uploading someone else&apos;s documents or a false selfie may lead to suspension of your account.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Payments.</strong>
              Payments you submit (UTR / transaction reference plus proof) are verified by hostel staff before approval. A submitted payment is not confirmed until staff approve it. Submitting false payment claims may lead to suspension and may be reported to hostel authorities.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Acceptable use.</strong>
              You agree not to misuse the Service, submit false data, attempt to access other users&apos; accounts or data, or interfere with the operation of the Service.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Staff accounts.</strong>
              Administrator and manager accounts carry additional responsibilities. Staff must only access resident data as required for hostel administration and must keep it confidential.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Service availability.</strong>
              We aim to keep the Service available but do not guarantee uninterrupted access. The Service is provided &ldquo;as is&rdquo; for hostel administration purposes.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Suspension and termination.</strong>
              We may suspend or terminate accounts that violate these terms or misuse the Service, with or without prior notice where necessary to protect other users.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Changes to these terms.</strong>
              We may update these terms from time to time. Material changes will be notified through the app. Continued use after changes take effect constitutes acceptance.
            </div>

            <div className="pt-3">
              <strong className="text-slate-900 block font-semibold mb-1">Contact.</strong>
              For questions about these terms, contact your hostel administrator or call us at{" "}
              <a
                href="tel:+918509568959"
                className="text-blue-600 hover:underline font-medium"
              >
                +91 85095 68959
              </a>
              .
            </div>
          </div>

          {/* Legal note */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 italic">
              This is a general template for a hostel-management app. It is not legal advice — consider having it reviewed by a legal professional for your jurisdiction.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 sm:px-6 mt-auto">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <p>© {new Date().getFullYear()} Mirror Hostels. All rights reserved.</p>

          <div className="flex items-center gap-4">
            <Link href="/privacy" className="hover:text-slate-800 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-slate-900 font-medium">
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
