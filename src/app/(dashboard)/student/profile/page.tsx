"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-auth";
import { useUserProfile } from "@/hooks/use-user-profile";
import { ProfilePageSkeleton } from "@/components/skeletons/page-skeletons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import Link from "next/link";
import { Loader2, AlertCircle, FileText, Camera, CheckCircle, XCircle, Clock, Download, Edit3, User, ExternalLink, MapPin, Eye } from "lucide-react";
import { format } from "date-fns";
import { ImagePreviewModal } from "@/components/ui/image-preview-modal";

export default function StudentProfilePage() {
  const { data: session } = useSession();
  const { userData, isLoading: isProfileLoading, mutate: mutateUser } = useUserProfile();
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [previewImage, setPreviewImage] = useState<{
    title: string;
    subtitle?: string;
    src: string;
    status?: string;
    fileName?: string;
  } | null>(null);

  useEffect(() => {
    if (userData?.studentProfile) {
      setFormData(userData.studentProfile);
    }
  }, [userData]);

  useEffect(() => {
    if (session?.user?.id) {
      fetch(`/api/profile/edit-request`)
        .then((res) => res.json())
        .then((json) => setPendingRequest(json.data))
        .catch((err) => console.error("Failed to fetch edit request", err));
    }
  }, [session?.user?.id]);

  const isLoading = isProfileLoading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/profile/edit-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to submit request");
      
      toast.success("Profile edit request submitted for approval");
      setPendingRequest(json.data);
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadPDF = async () => {
    setIsGeneratingPDF(true);
    try {
      const { generateAdmissionFormPDF } = await import("@/lib/pdf-generator");
      await generateAdmissionFormPDF(userData);
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return <ProfilePageSkeleton />;
  }

  const profile = userData?.studentProfile;

  return (
    <div className="space-y-6 max-w-4xl mx-auto w-full pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-0.5">View and request changes to your personal details.</p>
      </div>

      {pendingRequest && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <h3 className="text-sm font-bold text-amber-900">Pending Approval</h3>
            <p className="text-xs text-amber-700 mt-1">
              You submitted a profile edit request on {new Date(pendingRequest.createdAt).toLocaleDateString()}. 
              An admin must approve your changes before they are applied.
            </p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm ring-1 ring-slate-200/80 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-800">Personal Details</h3>
              <p className="text-xs text-slate-400">Your verified student information</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {!isEditing && !pendingRequest && (
              <Button 
                onClick={() => setIsEditing(true)} 
                variant="outline"
                className="h-9 text-xs border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 shadow-sm rounded-lg"
              >
                <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                Request Edit
              </Button>
            )}
            {userData?.isProfileComplete && (
              <Button 
                onClick={handleDownloadPDF} 
                disabled={isGeneratingPDF} 
                className="h-9 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm rounded-lg"
              >
                {isGeneratingPDF ? <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
                <span className="hidden sm:inline">Admission Form</span>
                <span className="sm:hidden">Form</span>
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-6 bg-slate-50/30">
          {isEditing ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Full Name</Label>
                  <Input name="fullName" value={formData.fullName || ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Date of Birth</Label>
                  <Input name="dateOfBirth" type="date" value={formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Mobile</Label>
                  <Input name="mobile" value={formData.mobile || ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-600">Personal Email</Label>
                  <Input name="personalEmail" type="email" value={formData.personalEmail || ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Father's Name</Label>
                  <Input name="fatherName" value={formData.fatherName || ""} onChange={handleChange} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Mother's Name</Label>
                  <Input name="motherName" value={formData.motherName || ""} onChange={handleChange} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Parent/Alt Mobile</Label>
                  <Input name="parentMobile" value={formData.parentMobile || ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Emergency Contact</Label>
                  <Input name="emergencyContact" value={formData.emergencyContact || ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Blood Group</Label>
                  <Input name="bloodGroup" value={formData.bloodGroup || ""} onChange={handleChange} className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-600">Permanent Address</Label>
                  <Input name="permanentAddress" value={formData.permanentAddress || ""} onChange={handleChange} required className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label className="text-xs font-semibold text-slate-600">Chronic Illnesses <span className="font-normal text-slate-400">(Optional)</span></Label>
                  <Input name="chronicIllnesses" value={formData.chronicIllnesses || ""} onChange={handleChange} placeholder="None" className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Allergies <span className="font-normal text-slate-400">(Optional)</span></Label>
                  <Input name="allergies" value={formData.allergies || ""} onChange={handleChange} placeholder="None" className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-slate-600">Regular Medications <span className="font-normal text-slate-400">(Optional)</span></Label>
                  <Input name="regularMedications" value={formData.regularMedications || ""} onChange={handleChange} placeholder="None" className="h-9 border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500/20 bg-white" />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <Button type="button" variant="ghost" onClick={() => { setIsEditing(false); setFormData(profile); }} className="h-9 text-sm rounded-lg text-slate-600">Cancel</Button>
                <Button type="submit" disabled={isSubmitting} className="h-9 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm">
                  {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  Submit Request
                </Button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-6">
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Full Name</Label>
                <p className="text-sm font-semibold text-slate-900">{profile?.fullName || "—"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Date of Birth</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.dateOfBirth ? format(new Date(profile.dateOfBirth), "MMM d, yyyy") : "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Mobile</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.mobile || "—"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Personal Email</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.personalEmail || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Father's Name</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.fatherName || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Mother's Name</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.motherName || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Parent/Alt Mobile</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.parentMobile || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Emergency Contact</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.emergencyContact || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Blood Group</Label>
                <p className="text-sm font-bold text-red-600 bg-red-50 inline-block px-1.5 py-0.5 rounded">{profile?.bloodGroup || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Permanent Address</Label>
                <p className="text-sm font-medium text-slate-800">{profile?.permanentAddress || "N/A"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Chronic Illnesses</Label>
                <p className="text-sm font-medium text-slate-600">{profile?.chronicIllnesses || "None"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Allergies</Label>
                <p className="text-sm font-medium text-slate-600">{profile?.allergies || "None"}</p>
              </div>
              <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <Label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Regular Medications</Label>
                <p className="text-sm font-medium text-slate-600">{profile?.regularMedications || "None"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <Camera className="w-4 h-4 text-slate-400" />
              Current Selfie
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Your verified profile photo</p>
          </div>
          <div className="p-6 flex-1 flex flex-col items-center justify-center bg-slate-50 gap-3">
            {userData?.selfies?.length > 0 ? (
              <>
                <div
                  onClick={() => setPreviewImage({
                    title: "Verified Profile Photo",
                    subtitle: `Captured on ${userData.selfies[0].capturedAt ? format(new Date(userData.selfies[0].capturedAt), "dd MMMM yyyy, HH:mm") : "N/A"}`,
                    src: userData.selfies[0].fileUrl,
                    status: "VERIFIED",
                    fileName: "verified-selfie.jpg"
                  })}
                  className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-[250px] aspect-square w-full cursor-pointer group"
                  title="Click to preview photo within this tab"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={userData.selfies[0].fileUrl} 
                    alt="Profile Selfie" 
                    className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-200"
                  />
                  <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <span className="bg-white/95 text-slate-900 text-xs font-semibold px-2.5 py-1 rounded-md shadow-sm flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> View Photo
                    </span>
                  </div>
                </div>
                <div className="w-full max-w-[250px] bg-white rounded-lg p-2.5 border border-slate-200 text-xs space-y-1.5 shadow-2xs">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Captured:</span>
                    <span className="font-medium text-slate-800">
                      {userData.selfies[0].capturedAt ? format(new Date(userData.selfies[0].capturedAt), "dd MMM yyyy, HH:mm") : "N/A"}
                    </span>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Coordinates:</span>
                      <span className="font-mono text-slate-900 font-semibold text-[11px]">
                        {userData.selfies[0].latitude != null && userData.selfies[0].longitude != null
                          ? `${Number(userData.selfies[0].latitude).toFixed(6)}, ${Number(userData.selfies[0].longitude).toFixed(6)}`
                          : "Not recorded"}
                      </span>
                    </div>
                    {userData.selfies[0].latitude != null && userData.selfies[0].longitude != null && (
                      <a
                        href={`https://www.google.com/maps?q=${userData.selfies[0].latitude},${userData.selfies[0].longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold hover:underline mt-1"
                      >
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        Open in Google Maps ↗
                      </a>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="aspect-square max-w-[250px] w-full flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300">
                <Camera className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm font-medium">No selfie uploaded</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-slate-400" />
                Uploaded Documents
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">Your identification documents</p>
            </div>
            <Link
              href="/student/documents"
              className="text-xs text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 hover:underline"
            >
              Manage Documents <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
          <div className="p-5 space-y-3 flex-1 bg-slate-50">
            {userData?.documents?.length > 0 ? (
              userData.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors shadow-sm group">
                  <div
                    onClick={() => setPreviewImage({
                      title: doc.documentType.replace(/_/g, ' '),
                      subtitle: `${doc.fileName} • Uploaded on ${doc.uploadedAt ? format(new Date(doc.uploadedAt), "dd MMMM yyyy") : ""}`,
                      src: doc.fileUrl,
                      status: doc.status,
                      fileName: doc.fileName
                    })}
                    className="flex items-center gap-3 overflow-hidden flex-1 cursor-pointer"
                    title="Click to preview within this tab"
                  >
                    <div className="w-9 h-9 bg-blue-50 flex items-center justify-center rounded-md shrink-0 group-hover:bg-blue-100 transition-colors">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate group-hover:text-blue-600 transition-colors">{doc.documentType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400 truncate">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    {(doc.status === "VERIFIED" || doc.status === "APPROVED") && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Approved</span>}
                    {doc.status === "PENDING" && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider"><Clock className="w-3 h-3" /> Pending</span>}
                    {doc.status === "REJECTED" && <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Rejected</span>}
                    <button
                      type="button"
                      onClick={() => setPreviewImage({
                        title: doc.documentType.replace(/_/g, ' '),
                        subtitle: `${doc.fileName} • Uploaded on ${doc.uploadedAt ? format(new Date(doc.uploadedAt), "dd MMMM yyyy") : ""}`,
                        src: doc.fileUrl,
                        status: doc.status,
                        fileName: doc.fileName
                      })}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                      title="Preview within this tab"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 flex flex-col items-center justify-center h-full bg-white border border-dashed border-slate-300 rounded-lg text-slate-500">
                <FileText className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-sm font-medium">No documents uploaded</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* In-Tab Image & Document Preview Modal */}
      <ImagePreviewModal
        open={!!previewImage}
        onOpenChange={(open) => !open && setPreviewImage(null)}
        title={previewImage?.title || ""}
        subtitle={previewImage?.subtitle}
        src={previewImage?.src}
        status={previewImage?.status}
        fileName={previewImage?.fileName}
      />
    </div>
  );
}

