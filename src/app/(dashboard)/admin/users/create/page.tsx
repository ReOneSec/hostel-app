"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Check, Eye, EyeOff, Loader2, Lock, Mail, Shield, Sparkles, User } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const createUserSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  role: z.enum(["SUPER_ADMIN", "HOSTEL_MANAGER", "MONTHLY_MANAGER", "STUDENT"]),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type CreateUserFormData = z.infer<typeof createUserSchema>;

function formatEmailFromUsername(username: string, role: string): string {
  const clean = username
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9._-]/g, "");
  if (!clean) return "";
  const domain = role === "STUDENT" ? "@mirror.std" : "@mirror.com";
  return `${clean}${domain}`;
}

export default function CreateUserPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(true);
  const [isCustomEmail, setIsCustomEmail] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      role: "STUDENT",
      password: "123456",
      email: "",
      username: "",
    },
  });

  const selectedRole = watch("role");
  const usernameValue = watch("username") || "";
  const emailValue = watch("email") || "";

  // Automatically compute and sync email based on username and role
  useEffect(() => {
    if (!isCustomEmail) {
      const generated = formatEmailFromUsername(usernameValue, selectedRole);
      setValue("email", generated, { shouldValidate: !!usernameValue.trim() });
    }
  }, [usernameValue, selectedRole, isCustomEmail, setValue]);

  async function onSubmit(data: CreateUserFormData) {
    setIsLoading(true);
    try {
      const finalEmail = data.email && data.email.includes("@") 
        ? data.email 
        : formatEmailFromUsername(data.username, data.role);
      
      const payload = {
        ...data,
        email: finalEmail,
        password: data.password || "123456",
      };

      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Failed to create user");
      }

      toast.success("User created successfully!");
      router.push("/admin/users");
      router.refresh();
    } catch (error: any) {
      toast.error(error.message || "An unexpected error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  const roleDomain = selectedRole === "STUDENT" ? "@mirror.std" : "@mirror.com";
  const previewEmail = formatEmailFromUsername(usernameValue, selectedRole) || `username${roleDomain}`;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/admin/users")} className="rounded-full">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create User</h1>
          <p className="text-muted-foreground mt-1">
            Add a new user to the system. Email and password are automatically configured.
          </p>
        </div>
      </div>

      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
          <CardDescription>
            Enter the user's name and choose their role. The login email and default password are automatically handled.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              {/* Username */}
              <div className="grid gap-2">
                <Label htmlFor="username">Username / Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="username"
                    placeholder="e.g. SIRAJ"
                    className="pl-10"
                    {...register("username")}
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
                {errors.username && (
                  <p className="text-sm text-destructive">{errors.username.message}</p>
                )}
              </div>

              {/* System Role */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="role">System Role</Label>
                  <span className="text-xs text-muted-foreground">
                    Domain: <span className="font-mono font-semibold text-primary">{roleDomain}</span>
                  </span>
                </div>
                <Select
                  value={selectedRole}
                  onValueChange={(value: any) => setValue("role", value)}
                  disabled={isLoading}
                >
                  <SelectTrigger className="w-full relative pl-10">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                    <SelectValue placeholder="Select a role">
                      {selectedRole === "STUDENT" ? "Student" :
                       selectedRole === "HOSTEL_MANAGER" ? "Hostel Manager" :
                       selectedRole === "MONTHLY_MANAGER" ? "Monthly Manager" :
                       selectedRole === "SUPER_ADMIN" ? "Super Admin" : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STUDENT">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>Student</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-200">
                          @mirror.std
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="HOSTEL_MANAGER">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>Hostel Manager</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                          @mirror.com
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MONTHLY_MANAGER">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>Monthly Manager</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                          @mirror.com
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem value="SUPER_ADMIN">
                      <div className="flex items-center justify-between w-full gap-4">
                        <span>Super Admin</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200">
                          @mirror.com
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <p className="text-sm text-destructive">{errors.role.message}</p>
                )}
              </div>

              {/* Email Address - Auto Computed */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="email">Email Address</Label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                      <Sparkles className="w-3 h-3 text-blue-500" />
                      Auto-selected by role
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsCustomEmail(!isCustomEmail)}
                    className="text-xs text-muted-foreground hover:text-foreground underline cursor-pointer"
                  >
                    {isCustomEmail ? "Reset to Auto" : "Customize"}
                  </button>
                </div>

                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={previewEmail}
                    className={cn(
                      "pl-10 font-mono text-sm",
                      !isCustomEmail && "bg-muted/40 text-foreground cursor-default select-all"
                    )}
                    readOnly={!isCustomEmail}
                    {...register("email")}
                    disabled={isLoading}
                  />
                  {!isCustomEmail && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium flex items-center gap-1 pointer-events-none">
                      <Lock className="w-3 h-3" /> Auto
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedRole === "STUDENT"
                    ? "Students automatically receive a @mirror.std login proxy email."
                    : "Staff and managers automatically receive a @mirror.com login email."}
                </p>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              {/* Temporary Password */}
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label htmlFor="password">Temporary Password</Label>
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900">
                      <Check className="w-3 h-3" />
                      Default: 123456
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 cursor-pointer"
                  >
                    {showPassword ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5" /> Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5" /> Show
                      </>
                    )}
                  </button>
                </div>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pl-10 font-mono"
                    {...register("password")}
                    disabled={isLoading}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Pre-filled with default <code className="px-1 py-0.5 rounded bg-muted font-mono font-semibold">123456</code>. The user can change this after logging in.
                </p>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>
            </div>

            <div className="pt-4 border-t flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/users")}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="cursor-pointer">
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating User...
                  </>
                ) : (
                  "Create User"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
