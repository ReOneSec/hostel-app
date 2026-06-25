"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, AlertCircle, FileText, Camera, CheckCircle, XCircle, Clock, Download, Edit3, User } from "lucide-react";
import { format } from "date-fns";
import { generateAdmissionFormPDF } from "@/lib/pdf-generator";

export default function StudentProfilePage() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState<any>(null);
  const [pendingRequest, setPendingRequest] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  useEffect(() => {
    if (session?.user?.id) {
      fetchData();
    }
  }, [session?.user?.id]);

  async function fetchData() {
    try {
      const [userRes, requestRes] = await Promise.all([
        fetch(`/api/users/me`),
        fetch(`/api/profile/edit-request`)
      ]);
      
      const userJson = await userRes.json();
      const requestJson = await requestRes.json();

      setUserData(userJson.data);
      if (userJson.data?.studentProfile) {
        setFormData(userJson.data.studentProfile);
      }
      setPendingRequest(requestJson.data);
    } catch (err) {
      console.error("Failed to fetch data", err);
      toast.error("Failed to load profile data");
    } finally {
      setIsLoading(false);
    }
  }

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
      await generateAdmissionFormPDF(userData);
    } catch (error) {
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-xl border border-slate-200 shadow-sm">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <p className="text-sm text-slate-400 font-medium">Loading your profile...</p>
      </div>
    );
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
          <div className="p-6 flex-1 flex items-center justify-center bg-slate-50">
            {userData?.selfies?.length > 0 ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm max-w-[250px] aspect-square w-full">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img 
                  src={userData.selfies[0].fileUrl} 
                  alt="Profile Selfie" 
                  className="object-cover w-full h-full"
                />
              </div>
            ) : (
              <div className="aspect-square max-w-[250px] w-full flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-300">
                <Camera className="w-10 h-10 text-slate-300 mb-2" />
                <p className="text-slate-500 text-sm font-medium">No selfie uploaded</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
              <FileText className="w-4 h-4 text-slate-400" />
              Uploaded Documents
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Your identification documents</p>
          </div>
          <div className="p-5 space-y-3 flex-1 bg-slate-50">
            {userData?.documents?.length > 0 ? (
              userData.documents.map((doc: any) => (
                <div key={doc.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-200 transition-colors shadow-sm group">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-9 h-9 bg-blue-50 flex items-center justify-center rounded-md shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{doc.documentType.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-slate-400 truncate">{doc.fileName}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    {(doc.status === "VERIFIED" || doc.status === "APPROVED") && <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider"><CheckCircle className="w-3 h-3" /> Approved</span>}
                    {doc.status === "PENDING" && <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 uppercase tracking-wider"><Clock className="w-3 h-3" /> Pending</span>}
                    {doc.status === "REJECTED" && <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200 uppercase tracking-wider"><XCircle className="w-3 h-3" /> Rejected</span>}
                    <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </a>
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
    </div>
  );
}

