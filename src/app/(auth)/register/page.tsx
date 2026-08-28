"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Building2,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Mail,
  User,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { registerOrganization } from "@/server/actions/auth";
import { completeOnboarding } from "@/server/actions/onboarding";
import { BUSINESS_TYPES } from "@/lib/widgets/defaults";
import { enrichDomainFromEmail } from "@/lib/onboarding/enrichment";
import { signIn } from "next-auth/react";

const STEPS = ["Identity & Workspace", "Select Vertical", "Launch Engine"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedBizType, setSelectedBizType] = useState<string>("logistics");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [createdOrgId, setCreatedOrgId] = useState<string>("");
  const [registeredCreds, setRegisteredCreds] = useState<{ email?: string; password?: string }>({});
  
  // Cinematic provisioning state
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [provisioningPhase, setProvisioningPhase] = useState(0);

  // Auto-enrichment state
  const [domainInfo, setDomainInfo] = useState<ReturnType<typeof enrichDomainFromEmail>>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      orgName: "",
      name: "",
      email: "",
      password: "",
    },
  });

  const watchedEmail = watch("email");
  const watchedOrgName = watch("orgName");
  const watchedPassword = watch("password");

  // Real-time domain enrichment effect
  useEffect(() => {
    if (!watchedEmail) {
      setDomainInfo(null);
      return;
    }
    const info = enrichDomainFromEmail(watchedEmail);
    if (info && info.isBusinessDomain) {
      setDomainInfo(info);
      if (!watchedOrgName || watchedOrgName === "") {
        setValue("orgName", info.suggestedOrgName);
      }
      if (info.suggestedVerticalKey && !selectedBizType) {
        setSelectedBizType(info.suggestedVerticalKey);
      }
    } else {
      setDomainInfo(null);
    }
  }, [watchedEmail, setValue, watchedOrgName, selectedBizType]);

  // STEP 1: Create workspace & account
  const onStep1Submit = async (data: RegisterInput) => {
    setServerError(null);
    const res = await registerOrganization({ ...data });
    if (!res || (res as any).error) {
      setServerError((res as any)?.error ?? "Something went wrong creating your workspace.");
      return;
    }
    setRegisteredCreds({ email: data.email, password: data.password });
    setCreatedOrgId((res as any).orgId ?? "");
    setStep(1);
  };

  // STEP 2: Advance to Launch
  const onStep2Next = () => {
    if (!selectedBizType) return;
    setStep(2);
  };

  // STEP 3: Cinematic Multi-Stage Launch Engine
  const onLaunchWorkspace = async () => {
    setIsProvisioning(true);
    setServerError(null);

    const phases = [
      "Configuring isolated tenant database...",
      `Calibrating ${selectedBizDef?.label || "Industry"} pipeline & stage models...`,
      "Activating Keel Autonomous AI agents (Deal Doctor & Prospector)...",
      "Injecting interactive sandbox sample data & AI lead scores...",
      "Finalizing workspace launch...",
    ];

    try {
      // Advance visual phases
      for (let i = 0; i < phases.length; i++) {
        setProvisioningPhase(i);
        await new Promise((resolve) => setTimeout(resolve, 550));
      }

      // Complete backend provisioning
      await completeOnboarding(createdOrgId, selectedBizType, answers);

      // Authenticate directly via next-auth client to establish session
      const creds = registeredCreds.email ? registeredCreds : getValues();
      if (creds.email && creds.password) {
        await signIn("credentials", {
          email: creds.email.trim().toLowerCase(),
          password: creds.password,
          redirect: false,
        });
      }

      // Redirect directly to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setServerError(err?.message || "Setup failed. Please try logging in with your new credentials.");
      setIsProvisioning(false);
    }
  };

  const selectedBizDef = BUSINESS_TYPES.find((b) => b.key === selectedBizType) || BUSINESS_TYPES[0];

  // Password strength helper
  const getPasswordStrength = (pass: string = "") => {
    if (!pass) return 0;
    let score = 0;
    if (pass.length >= 8) score += 35;
    if (pass.length >= 12) score += 25;
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass)) score += 25;
    if (/[^A-Za-z0-9]/.test(pass)) score += 15;
    return Math.min(score, 100);
  };
  const pwStrength = getPasswordStrength(watchedPassword);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Top Header & Brand */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1 text-xs font-semibold text-primary mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Next-Gen Autonomous CRM Engine</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {step === 0 && "Create your organization"}
          {step === 1 && "Select your industry model"}
          {step === 2 && "Deploy your workspace"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 0 && "Zero credit card required • Full Pro capabilities for 14 days"}
          {step === 1 && "We will customize your pipelines, widgets, and AI models instantly"}
          {step === 2 && "Pre-populating your workspace with interactive sandbox demo data"}
        </p>
      </div>

      {/* Progress Step Bar */}
      <div className="flex items-center gap-0 mb-8 px-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div
              className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold border-2 transition-all shadow-sm ${
                i < step
                  ? "bg-primary border-primary text-primary-foreground"
                  : i === step
                  ? "border-primary text-primary bg-primary/10 ring-4 ring-primary/10"
                  : "border-border text-muted-foreground bg-card"
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`ml-2 text-xs font-medium hidden sm:block ${
                i === step ? "text-foreground font-semibold" : "text-muted-foreground"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-3 transition-colors ${
                  i < step ? "bg-primary" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Card Wrapper */}
      <div className="rounded-2xl border border-border bg-card/80 p-6 sm:p-8 shadow-xl backdrop-blur-md">
        {/* ── STEP 1: Identity & Workspace Basics ── */}
        {step === 0 && (
          <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
            {/* Domain Enrichment Badge */}
            {domainInfo && domainInfo.isBusinessDomain && (
              <div className="flex items-center gap-2.5 rounded-xl border border-primary/20 bg-primary/5 p-3 animate-in fade-in slide-in-from-top-2 duration-300">
                {domainInfo.faviconUrl ? (
                  <img
                    src={domainInfo.faviconUrl}
                    alt=""
                    className="w-5 h-5 rounded-full object-contain"
                    onError={(e) => ((e.target as HTMLElement).style.display = "none")}
                  />
                ) : (
                  <Building2 className="w-4 h-4 text-primary" />
                )}
                <div className="text-xs">
                  <span className="text-muted-foreground">Auto-detected Company: </span>
                  <strong className="text-foreground">{domainInfo.suggestedOrgName}</strong>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold">
                Work Email Address
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="alex@acmelogistics.com"
                  className="pl-9 text-sm"
                  {...register("email")}
                />
                <Mail className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="orgName" className="text-xs font-semibold">
                Company / Organization Name
              </Label>
              <div className="relative">
                <Input
                  id="orgName"
                  placeholder="Acme Global Freight Ltd."
                  className="pl-9 text-sm"
                  {...register("orgName")}
                />
                <Building2 className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold">
                Your Full Name
              </Label>
              <div className="relative">
                <Input
                  id="name"
                  placeholder="Alex Rivera"
                  className="pl-9 text-sm"
                  {...register("name")}
                />
                <User className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold">
                Account Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 characters"
                  className="pl-9 text-sm"
                  {...register("password")}
                />
                <Lock className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
              </div>
              {watchedPassword && (
                <div className="space-y-1 mt-1.5">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        pwStrength > 70
                          ? "bg-green-500"
                          : pwStrength > 40
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${pwStrength}%` }}
                    />
                  </div>
                </div>
              )}
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>

            {serverError && (
              <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full h-10 font-semibold shadow-md mt-2" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating workspace...
                </>
              ) : (
                <>
                  Continue <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </form>
        )}

        {/* ── STEP 2: Interactive Vertical Selector ── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
              {BUSINESS_TYPES.map((biz) => {
                const isSelected = selectedBizType === biz.key;
                return (
                  <button
                    key={biz.key}
                    type="button"
                    onClick={() => setSelectedBizType(biz.key)}
                    className={`relative flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                        : "border-border bg-card/60 hover:border-border hover:bg-muted/40"
                    }`}
                  >
                    <span className="text-2xl mt-0.5">{biz.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-bold leading-tight ${isSelected ? "text-primary" : "text-foreground"}`}>
                          {biz.label}
                        </p>
                        {isSelected && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {biz.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Team Size */}
            <div className="space-y-1.5 pt-2 border-t border-border">
              <Label className="text-xs font-semibold">Sales Team Size</Label>
              <div className="grid grid-cols-4 gap-2">
                {["Just me", "2–5 reps", "6–20 reps", "20+ enterprise"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, team_size: opt }))}
                    className={`px-2 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                      answers.team_size === opt
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => setStep(0)} className="flex-1 gap-1 h-10">
                <ArrowLeft className="h-4 w-4" /> Back
              </Button>
              <Button onClick={onStep2Next} className="flex-1 gap-1 h-10 font-semibold">
                Continue <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Cinematic Launch Sequence ── */}
        {step === 2 && (
          <div>
            {!isProvisioning ? (
              <div className="space-y-5">
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedBizDef.icon}</span>
                    <div>
                      <h3 className="text-sm font-bold text-foreground">
                        {selectedBizDef.label} Workspace Ready
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Auto-calibrating custom pipelines & smart tools
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-primary/10 space-y-1.5">
                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span>3 Pre-loaded {selectedBizDef.label} interactive deals in Sandbox</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span>AI Lead Scoring & Autonomous Copilot Agents</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-foreground font-medium">
                      <Check className="w-3.5 h-3.5 text-primary" />
                      <span>Automated 14-day Reverse Pro Trial Activated</span>
                    </div>
                  </div>
                </div>

                {serverError && (
                  <p className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-xs text-destructive">
                    {serverError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-1 h-10">
                    <ArrowLeft className="h-4 w-4" /> Change Vertical
                  </Button>
                  <Button
                    onClick={onLaunchWorkspace}
                    className="flex-1 gap-1 h-10 font-bold bg-primary shadow-lg shadow-primary/20 hover:shadow-primary/30"
                  >
                    <Building2 className="h-4 w-4" /> Launch Workspace
                  </Button>
                </div>
              </div>
            ) : (
              /* Provisioning Live Progress Sequence */
              <div className="py-6 space-y-6 text-center animate-in fade-in duration-300">
                <div className="relative flex items-center justify-center w-16 h-16 mx-auto">
                  <div className="absolute inset-0 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                  <Sparkles className="w-6 h-6 text-primary animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-bold text-foreground">
                    Provisioning Your Autonomous CRM
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    {provisioningPhase === 0 && "⚡ Initializing tenant schema & security boundary..."}
                    {provisioningPhase === 1 && `🎯 Calibrating ${selectedBizDef.label} pipelines & probabilities...`}
                    {provisioningPhase === 2 && "🤖 Deploying Keel AI Lead Scoring & Copilot..."}
                    {provisioningPhase === 3 && "📦 Injecting interactive sandbox demo data..."}
                    {provisioningPhase >= 4 && "✨ Launching your dashboard..."}
                  </p>
                </div>

                <div className="max-w-xs mx-auto space-y-2 text-left">
                  {[
                    "Isolated Multi-Tenant Database",
                    `${selectedBizDef.label} Pipeline Stages`,
                    "Autonomous AI Agents",
                    "Interactive Sandbox Data",
                  ].map((label, idx) => (
                    <div key={label} className="flex items-center gap-2 text-xs">
                      {idx <= provisioningPhase ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                      ) : (
                        <div className="w-3.5 h-3.5 rounded-full border border-border shrink-0" />
                      )}
                      <span
                        className={
                          idx <= provisioningPhase
                            ? "text-foreground font-medium"
                            : "text-muted-foreground"
                        }
                      >
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer Link */}
      <p className="mt-6 text-center text-xs text-muted-foreground">
        Already have a workspace?{" "}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
