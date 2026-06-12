"use client";

import { Suspense, useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Building2, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("JS Intercepted the form submission! Calling handleSubmit...");
    handleSubmit(onSubmit)(e);
  };

  async function onSubmit(data: LoginFormData) {
    console.log("onSubmit triggered with email:", data.email);
    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      console.log("Calling loginAction...");
      const result = await loginAction(formData);
      console.log("loginAction result:", result);

      if (result.error) {
        console.error("loginAction returned error:", result.error);
        setError(result.error);
      } else if (result.success) {
        console.log("Login successful, redirecting...");
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={onFormSubmit} className="space-y-4">
      {/* Error display */}
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="w-1.5 h-1.5 rounded-full bg-destructive mt-1.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Email Field */}
      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">
          Email Address
        </Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            className="pl-10 h-11 transition-all focus:shadow-sm focus:shadow-primary/10"
            {...register("email")}
            disabled={isLoading}
            autoComplete="email"
            autoFocus
          />
        </div>
        {errors.email && (
          <p className="text-xs text-destructive mt-1">
            {errors.email.message}
          </p>
        )}
      </div>

      {/* Password Field */}
      <div className="space-y-2">
        <Label htmlFor="password" className="text-sm font-medium">
          Password
        </Label>
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder="Enter your password"
            className="pl-10 pr-10 h-11 transition-all focus:shadow-sm focus:shadow-primary/10"
            {...register("password")}
            disabled={isLoading}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>
        </div>
        {errors.password && (
          <p className="text-xs text-destructive mt-1">
            {errors.password.message}
          </p>
        )}
      </div>

      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-11 font-medium text-sm transition-all hover:shadow-md hover:shadow-primary/20 cursor-pointer"
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Signing in...
          </>
        ) : (
          "Sign In"
        )}
      </Button>
    </form>
  );
}

export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-accent/30">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary/8 rounded-full blur-3xl animate-pulse [animation-delay:1s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                           linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo / Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4 shadow-lg shadow-primary/5">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Mirror Hostels
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Hostel Management & Mess Accounting System
          </p>
        </div>

        {/* Login Card */}
        <Card className="border-border/50 shadow-xl shadow-primary/5 backdrop-blur-sm bg-card/80">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">
              Sign in to your account
            </CardTitle>
            <CardDescription className="text-center">
              Enter your credentials to access the portal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Suspense fallback={<div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              <LoginForm />
            </Suspense>

            {/* Footer note */}
            <p className="text-xs text-muted-foreground text-center mt-6">
              Credentials provided by your hostel administrator.
              <br />
              Contact admin if you need access.
            </p>
          </CardContent>
        </Card>

        {/* Bottom branding */}
        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          © {new Date().getFullYear()} Mirror Hostels. All rights reserved.
        </p>
      </div>
    </div>
  );
}
