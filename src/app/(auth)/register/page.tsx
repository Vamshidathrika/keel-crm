"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { Loader2, ArrowRight, ArrowLeft, Check, Building2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerSchema, type RegisterInput } from "@/lib/validators/auth";
import { registerOrganization } from "@/server/actions/auth";
import { completeOnboarding } from "@/server/actions/onboarding";
import { BUSINESS_TYPES } from "@/lib/widgets/defaults";
import { signIn } from "next-auth/react";

const STEPS = ["Your Workspace", "Your Business", "Quick Setup"] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [serverError, setServerError] = useState<string | null>(null);
  const [selectedBizType, setSelectedBizType] = useState<string>("");
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [createdOrgId, setCreatedOrgId] = useState<string>("");
  const [registeredCreds, setRegisteredCreds] = useState<{ email?: string; password?: string }>({});
  const [finalizing, setFinalizing] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    getValues,
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  // STEP 1: Create workspace
  const onStep1Submit = async (data: RegisterInput) => {
    setServerError(null);
    const res = await registerOrganization({ ...data, businessType: "" });
    if (!res || (res as any).error) {
      setServerError((res as any)?.error ?? "Something went wrong creating your workspace.");
      return;
    }
    setRegisteredCreds({ email: data.email, password: data.password });
    setCreatedOrgId((res as any).orgId ?? "");
    setStep(1);
  };

  // STEP 2: Business type selection
  const onStep2Next = () => {
    if (!selectedBizType) return;
    setStep(2);
  };

  // STEP 3: Contextual Q&A → finalize
  const onStep3Submit = async () => {
    setFinalizing(true);
    setServerError(null);
    try {
      await completeOnboarding(createdOrgId, selectedBizType, answers);

      // Authenticate directly via next-auth client to mint session cookies
      const creds = registeredCreds.email ? registeredCreds : getValues();
      if (creds.email && creds.password) {
        await signIn("credentials", {
          email: creds.email.trim().toLowerCase(),
          password: creds.password,
          redirect: false,
        });
      }

      // Hard redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: any) {
      setServerError(err?.message || "Setup failed. Please try logging in with your new credentials.");
      setFinalizing(false);
    }
  };

  const selectedBizDef = BUSINESS_TYPES.find((b) => b.key === selectedBizType);

  return (
    <div className="w-full max-w-md">
      {/* Progress Steps */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center flex-1 last:flex-none">
            <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border-2 transition-all ${
              i < step ? "bg-primary border-primary text-primary-foreground" :
              i === step ? "border-primary text-primary bg-primary/10" :
              "border-border text-muted-foreground"
            }`}>
              {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`ml-1.5 text-[10px] font-semibold hidden sm:block ${i === step ? "text-foreground" : "text-muted-foreground"}`}>
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${i < step ? "bg-primary" : "bg-border"}`} />
            )}
          </div>
        ))}
      </div>

      {/* ── STEP 1: Workspace Basics ── */}
      {step === 0 && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Create your workspace</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;ll be the Admin. Invite your team afterwards from Settings.
          </p>
          <form onSubmit={handleSubmit(onStep1Submit)} className="mt-8 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="orgName">Organization name</Label>
              <Input id="orgName" placeholder="Acme Logistics Ltd." {...register("orgName")} />
              {errors.orgName && <p className="text-xs text-destructive">{errors.orgName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="name">Your name</Label>
              <Input id="name" placeholder="Jane Doe" {...register("name")} />
              {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="At least 8 characters" {...register("password")} />
              {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
            </div>
            {serverError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
            )}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Continue <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
          <p className="mt-6 text-center text-sm text-muted-foreground">
            Already have a workspace?{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </div>
      )}

      {/* ── STEP 2: Business Type Selector ── */}
      {step === 1 && (
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">What&apos;s your business?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            We&apos;ll activate the right tools and widgets for your industry automatically.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            {BUSINESS_TYPES.map((biz) => (
              <button
                key={biz.key}
                type="button"
                onClick={() => setSelectedBizType(biz.key)}
                className={`relative flex flex-col items-start gap-2 p-3.5 rounded-xl border-2 text-left transition-all duration-200 cursor-pointer group ${
                  selectedBizType === biz.key
                    ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                    : "border-border bg-card hover:border-border-hover hover:bg-muted/30"
                }`}
              >
                <span className="text-2xl">{biz.icon}</span>
                <div>
                  <p className={`text-xs font-semibold leading-tight ${selectedBizType === biz.key ? "text-primary" : "text-foreground"}`}>
                    {biz.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
                    {biz.description}
                  </p>
                </div>
                {selectedBizType === biz.key && (
                  <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep(0)} className="flex-1 gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              className="flex-1 gap-1"
              onClick={onStep2Next}
              disabled={!selectedBizType}
            >
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Contextual Questions ── */}
      {step === 2 && selectedBizDef && (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{selectedBizDef.icon}</span>
            <h2 className="text-2xl font-semibold tracking-tight">Quick setup</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-6">
            A few questions to personalise your {selectedBizDef.label} workspace.
          </p>

          <div className="space-y-5">
            {/* Team size — universal question */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold">How many sales reps will use this?</Label>
              <div className="grid grid-cols-2 gap-2">
                {["Just me", "2–5", "6–20", "20+"].map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAnswers((a) => ({ ...a, team_size: opt }))}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
                      answers.team_size === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:border-muted-foreground"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Industry-specific questions */}
            {selectedBizDef.industryQuestions.map((q) => (
              <div key={q.key} className="space-y-2">
                <Label className="text-xs font-semibold">{q.label}</Label>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setAnswers((a) => ({ ...a, [q.key]: opt }))}
                      className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all cursor-pointer text-left ${
                        answers[q.key] === opt
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-foreground hover:border-muted-foreground"
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* What gets activated preview */}
          <div className="mt-6 p-3 rounded-lg border border-border bg-ai/5 border-ai/20">
            <p className="text-[10px] font-semibold text-ai flex items-center gap-1 mb-2">
              <Sparkles className="w-3 h-3" /> Auto-activating for {selectedBizDef.label}
            </p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">
              Contacts, Companies, Deals Pipeline, Tasks, AI Lead Scoring
              {selectedBizDef.key === "logistics" && ", Cargo Rate Calculator, Shipment Tracker"}
              {selectedBizDef.key === "saas" && ", MRR Dashboard, Trial Tracker, Churn Risk Score"}
              {selectedBizDef.key === "real_estate" && ", Property Listings, Commission Calculator"}
              {selectedBizDef.key === "healthcare" && ", Appointment Tracker, Referral Manager"}
              {selectedBizDef.key === "manufacturing" && ", Quote Builder (CPQ), Supplier Manager"}
              {selectedBizDef.key === "consulting" && ", Project Tracker, Time & Billing"}
              {selectedBizDef.key === "ecommerce" && ", Order Tracker, Customer LTV Score"}
              {selectedBizDef.key === "finance" && ", KYC Tracker, Investment Calculator"}
              {" + Workflow Automations"}
            </p>
          </div>

          {serverError && (
            <p className="mt-3 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{serverError}</p>
          )}

          <div className="mt-6 flex gap-3">
            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 gap-1">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button
              className="flex-1 gap-1 bg-primary"
              onClick={onStep3Submit}
              disabled={finalizing}
            >
              {finalizing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
              Launch Workspace
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
