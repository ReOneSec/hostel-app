import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { CheckCircle2, XCircle, ShieldCheck } from "lucide-react";
import Image from "next/image";

export default async function VerifyStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  const user = await prisma.user.findUnique({
    where: { id },
    include: { studentProfile: true }
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-6 border border-slate-100">
          <div className="mx-auto bg-red-50 w-24 h-24 rounded-full flex items-center justify-center">
            <XCircle className="w-12 h-12 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Invalid QR Code</h1>
            <p className="text-slate-500 mt-2">This student record could not be found in our system.</p>
          </div>
        </div>
      </div>
    );
  }

  const studentName = user.studentProfile?.fullName || user.username || "Student";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-8 border border-slate-100 relative overflow-hidden">
        
        {/* Top Decorative bar */}
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-green-400 to-green-600"></div>

        {/* Verification Icon */}
        <div className="mx-auto bg-green-50 w-28 h-28 rounded-full flex items-center justify-center relative">
          <div className="absolute inset-0 rounded-full animate-ping bg-green-100 opacity-75"></div>
          <ShieldCheck className="w-16 h-16 text-green-600 relative z-10" />
        </div>
        
        {/* Student Identity */}
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">{studentName}</h1>
          <p className="text-slate-500 font-medium">ID: {user.id.slice(-6).toUpperCase()}</p>
        </div>

        {/* Status Badge */}
        <div className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl flex flex-col items-center justify-center gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-6 h-6" />
            <span className="font-extrabold tracking-widest text-lg">VERIFIED</span>
          </div>
          <span className="text-xs font-semibold text-green-600/80">AUTHENTIC MIRROR HOSTELS RECORD</span>
        </div>

        {/* Footer */}
        <div className="text-sm text-slate-400 mt-8 pt-6 border-t border-slate-100">
          This digital profile confirms the active registration and verification of the student at Mirror Hostels.
        </div>
      </div>
    </div>
  );
}
