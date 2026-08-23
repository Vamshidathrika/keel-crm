"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loginSchema, type LoginInput } from "@/lib/validators/auth";
import { loginWithCredentials } from "@/server/actions/auth";

export default function LoginPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    const res = await loginWithCredentials(data);
    if (res?.error) {
      setServerError(res.error);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handleDemoLogin = async () => {
    setValue("email", "admin@keel.crm");
    setValue("password", "password123");
    await onSubmit({ email: "admin@keel.crm", password: "password123" });
  };

  return (
    <div>
      <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
      <p className="mt-1 text-sm text-muted-foreground">Sign in to your Keel workspace.</p>

      <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4">
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
        <div className="flex flex-col gap-2">
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Sign in
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleDemoLogin}
            className="w-full border-dashed border-primary/40 text-primary hover:bg-primary/5 hover:text-primary"
            disabled={isSubmitting}
          >
            ⚡ Quick Demo Login
          </Button>
        </div>
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
