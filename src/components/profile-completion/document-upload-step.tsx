"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  FileUp,
  Upload,
  X,
  FileText,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { compressImageClientSide } from "@/lib/image-compression";

interface UploadedDoc {
  id: string;
  type: string;
  fileName: string;
}

interface DocumentUploadStepProps {
  onUploaded: () => void;
  onNext: () => void;
  onPrev: () => void;
  isUploaded: boolean;
}

const DOC_TYPES = [
  { value: "AADHAAR", label: "Aadhaar Card" },
  { value: "VOTER_CARD", label: "Voter ID Card" },
  { value: "PASSPORT", label: "Passport" },
  { value: "DRIVING_LICENCE", label: "Driving Licence" },
  { value: "PAN_CARD", label: "PAN Card" },
];

export function DocumentUploadStep({
  onUploaded,
  onNext,
  onPrev,
  isUploaded,
}: DocumentUploadStepProps) {
  const [selectedType, setSelectedType] = useState("");
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch("/api/users/me");
        if (res.ok) {
          const data = await res.json();
          if (data?.data?.documents?.length > 0) {
            setUploadedDocs(
              data.data.documents.map((doc: any) => ({
                id: doc.id,
                type: doc.documentType,
                fileName: doc.fileName,
              }))
            );
            onUploaded();
          }
        }
      } catch (error) {
        console.error("Failed to fetch documents", error);
      }
    }
    fetchDocuments();
  }, [onUploaded]);

  async function handleFileUpload(file: File) {
    if (!selectedType) {
      toast.error("Please select a document type first");
      return;
    }

    // Validate file
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      toast.error("Only JPG, PNG, and WebP images are allowed");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB");
      return;
    }

    setIsUploading(true);
    try {
      toast.info("Compressing image...");
      const compressedFile = await compressImageClientSide(file);

      const formData = new FormData();
      formData.append("file", compressedFile);
      formData.append("documentType", selectedType);

      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const result = await res.json();

      setUploadedDocs((prev) => [
        ...prev,
        {
          id: result.data?.id ?? crypto.randomUUID(),
          type: selectedType,
          fileName: file.name,
        },
      ]);

      onUploaded();
      toast.success(`${file.name} uploaded successfully`);
      setSelectedType("");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload document"
      );
    } finally {
      setIsUploading(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileUpload(file);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <FileUp className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Document Upload</h2>
          <p className="text-sm text-muted-foreground">
            Upload at least one government-issued ID
          </p>
        </div>
      </div>

      {/* Document Type Select */}
      <div className="space-y-2">
        <Label>Document Type *</Label>
        <Select value={selectedType} onValueChange={(val) => setSelectedType(val ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select document type" />
          </SelectTrigger>
          <SelectContent>
            {DOC_TYPES.map((doc) => (
              <SelectItem key={doc.value} value={doc.value}>
                {doc.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Drop Zone */}
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center
          transition-all duration-200 cursor-pointer
          ${
            dragActive
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }
          ${!selectedType ? "opacity-50 pointer-events-none" : ""}
        `}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-10 h-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <div className="p-3 rounded-full bg-primary/10">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium">
                Drop your file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPG, PNG, or WebP up to 5MB
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Uploaded Documents List */}
      {uploadedDocs.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium">Uploaded Documents</Label>
          {uploadedDocs.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50"
            >
              <FileText className="w-4 h-4 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{doc.fileName}</p>
                <p className="text-xs text-muted-foreground">
                  {DOC_TYPES.find((d) => d.value === doc.type)?.label}
                </p>
              </div>
              <Badge
                variant="outline"
                className="border-emerald-500/30 text-emerald-600 bg-emerald-500/5 shrink-0"
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Uploaded
              </Badge>
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onPrev}
          className="cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!isUploaded}
          className="cursor-pointer"
        >
          Next Step
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
