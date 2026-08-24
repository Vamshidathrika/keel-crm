"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2, ShieldCheck, UserCheck, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";

export default function LoginPage() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [demoLoadingRole, setDemoLoadingRole] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      const res = await signIn("credentials", {
        email: data.email.trim().toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        setServerError("Invalid email or password. Please check your credentials.");
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setServerError(err?.message || "An unexpected error occurred during login.");
    }
  };

  const handleQuickLogin = async (email: string, roleName: string) => {
    setServerError(null);
    setDemoLoadingRole(roleName);
    setValue("email", email, { shouldValidate: true });
    setValue("password", "password123", { shouldValidate: true });

    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: "password123",
        redirect: false,
      });

      if (res?.error || !res?.ok) {
        setServerError("Failed to sign in with demo credentials. Please verify your connection.");
        setDemoLoadingRole(null);
        return;
      }

      window.location.href = "/dashboard";
    } catch (err: any) {
      setServerError(err?.message || "Failed to log in with dummy credentials.");
      setDemoLoadingRole(null);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your Keel workspace.</p>

      {/* 1-Click Dummy Credentials Picker */}
      <div className="mt-6 rounded-lg border border-border/80 bg-muted/20 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-muted-foreground">
            ⚡ Quick Demo Accounts (1-Click Login)
          </span>
          <span className="text-[10px] text-muted-foreground font-mono">pwd: password123</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickLogin("admin@keel.crm", "admin")}
            disabled={isSubmitting || !!demoLoadingRole}
            className="h-auto py-2 px-2 flex flex-col items-center gap-1 border-primary/30 hover:border-primary hover:bg-primary/5 text-foreground"
          >
            {demoLoadingRole === "admin" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            )}
            <span className="text-xs font-semibold">Admin</span>
            <span className="text-[9px] text-muted-foreground font-mono">admin@keel.crm</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickLogin("manager@keel.crm", "manager")}
            disabled={isSubmitting || !!demoLoadingRole}
            className="h-auto py-2 px-2 flex flex-col items-center gap-1 border-border hover:border-primary hover:bg-primary/5 text-foreground"
          >
            {demoLoadingRole === "manager" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <UserCheck className="w-3.5 h-3.5 text-amber-500" />
            )}
            <span className="text-xs font-semibold">Manager</span>
            <span className="text-[9px] text-muted-foreground font-mono">manager@keel.crm</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleQuickLogin("rep@keel.crm", "rep")}
            disabled={isSubmitting || !!demoLoadingRole}
            className="h-auto py-2 px-2 flex flex-col items-center gap-1 border-border hover:border-primary hover:bg-primary/5 text-foreground"
          >
            {demoLoadingRole === "rep" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            ) : (
              <Briefcase className="w-3.5 h-3.5 text-emerald-500" />
            )}
            <span className="text-xs font-semibold">Sales Rep</span>
            <span className="text-[9px] text-muted-foreground font-mono">rep@keel.crm</span>
          </Button>
        </div>
      </div>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground font-mono text-[10px]">
            Or enter credentials manually
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
          {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input id="password" type="password" placeholder="••••••••" {...register("password")} />
          {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
        </div>
        {serverError && (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
        )}
        <Button type="submit" className="w-full" disabled={isSubmitting || !!demoLoadingRole}>
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Keel?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline">
          Create a workspace
        </Link>
      </p>
    </div>
  );
}
