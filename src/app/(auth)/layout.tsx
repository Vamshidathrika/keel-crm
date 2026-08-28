import { Anchor } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 py-12 sm:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="flex items-center gap-2 mb-10">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Anchor className="h-4 w-4" />
            </span>
            <span className="text-lg font-semibold tracking-tight">Keel</span>
          </div>
          {children}
        </div>
      </div>
      <div className="hidden lg:flex flex-col justify-between bg-[#262624] text-[#f1f1ef] p-12 relative overflow-hidden border-l border-[#3e3e38]">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, rgba(201,100,66,0.35), transparent 40%), radial-gradient(circle at 80% 70%, rgba(156,135,245,0.25), transparent 45%)",
          }}
        />
        <div className="relative">
          <p className="font-mono text-xs uppercase tracking-widest text-[#b7b5a9]">AI-native CRM</p>
          <h1 className="mt-4 text-3xl font-semibold leading-tight max-w-md text-[#faf9f5]">
            The CRM that keeps every deal on course.
          </h1>
        </div>
        <div className="relative rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-[#c96442] font-mono uppercase tracking-wider font-bold">
            <span className="h-1.5 w-1.5 rounded-full bg-[#c96442]" /> AI Insight
          </div>
          <p className="mt-2 text-sm text-[#e5e5e2] leading-relaxed">
            &ldquo;Hot lead, no activity in 6 days &mdash; recommend a follow-up call before Friday.&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
