"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Video,
} from "lucide-react";
import { toast } from "sonner";

interface SelfieCaptureStepProps {
  onCaptured: () => void;
  onPrev: () => void;
  isCaptured: boolean;
}

export function SelfieCaptureStep({
  onCaptured,
  onPrev,
  isCaptured,
}: SelfieCaptureStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    setIsStarting(true);
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });
      setStream(mediaStream);
    } catch (error) {
      console.error("Camera error:", error);
      setCameraError(
        "Camera access denied. Please allow camera permissions in your browser settings."
      );
    } finally {
      setIsStarting(false);
    }
  }, []);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Video play error:", e));
    }
  }, [stream]);

  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      // Mirror the image for selfie
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }

    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    setCapturedImage(dataUrl);
    stopCamera();
  }

  function retakePhoto() {
    setCapturedImage(null);
    startCamera();
  }

  async function uploadSelfie() {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      // Convert data URL to blob
      const response = await fetch(capturedImage);
      const blob = await response.blob();

      // Get geolocation
      let latitude: number | null = null;
      let longitude: number | null = null;

      try {
        const position = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              timeout: 5000,
              enableHighAccuracy: false,
            });
          }
        );
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch {
        // Geolocation is optional
        console.log("Geolocation not available");
      }

      const formData = new FormData();
      formData.append("file", blob, "selfie.jpg");
      formData.append("capturedAt", new Date().toISOString());
      formData.append("deviceInfo", navigator.userAgent);
      formData.append("triggerType", "PROFILE_COMPLETION");
      if (latitude !== null) formData.append("latitude", String(latitude));
      if (longitude !== null) formData.append("longitude", String(longitude));

      const res = await fetch("/api/selfie/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      onCaptured();
      toast.success("Selfie uploaded successfully! ✨");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload selfie"
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-primary/10">
          <Camera className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Selfie Capture</h2>
          <p className="text-sm text-muted-foreground">
            Take a clear photo of yourself for verification
          </p>
        </div>
      </div>

      {/* Hidden canvas for capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Camera / Captured Image Area */}
      <div className="relative rounded-xl overflow-hidden bg-muted aspect-[4/3] max-w-md mx-auto">
        {capturedImage ? (
          // Show captured selfie
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={capturedImage}
            alt="Captured selfie"
            className="w-full h-full object-cover"
          />
        ) : stream ? (
          // Show live camera feed
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover scale-x-[-1]"
          />
        ) : (
          // Placeholder
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {cameraError ? (
              <>
                <div className="text-destructive text-center px-6">
                  <p className="text-sm font-medium">{cameraError}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={startCamera}
                  className="cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <div className="p-4 rounded-full bg-primary/10">
                  <Video className="w-8 h-8 text-primary" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">Camera Preview</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Click below to start the camera
                  </p>
                </div>
                <Button
                  onClick={startCamera}
                  disabled={isStarting}
                  className="cursor-pointer"
                >
                  {isStarting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Starting...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4 mr-2" />
                      Start Camera
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        )}

        {/* Capture overlay */}
        {stream && !capturedImage && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/60 to-transparent flex justify-center">
            <button
              onClick={capturePhoto}
              className="w-16 h-16 rounded-full bg-white border-4 border-white/60 shadow-lg
                         hover:scale-105 active:scale-95 transition-transform
                         flex items-center justify-center cursor-pointer"
            >
              <div className="w-12 h-12 rounded-full bg-white border-2 border-gray-300" />
            </button>
          </div>
        )}
      </div>

      {/* Captured controls */}
      {capturedImage && !isCaptured && (
        <div className="flex justify-center gap-3">
          <Button variant="outline" onClick={retakePhoto} className="cursor-pointer">
            <RefreshCw className="w-4 h-4 mr-2" />
            Retake
          </Button>
          <Button onClick={uploadSelfie} disabled={isUploading} className="cursor-pointer">
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Use This Photo
              </>
            )}
          </Button>
        </div>
      )}

      {/* Success state */}
      {isCaptured && (
        <div className="flex justify-center">
          <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 px-4 py-2">
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Selfie uploaded successfully
          </Badge>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            stopCamera();
            onPrev();
          }}
          className="cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Previous
        </Button>
        <div /> {/* Spacer — final submit is in parent */}
      </div>
    </div>
  );
}
