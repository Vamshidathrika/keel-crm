import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { runCopilotToolLoop } from "@/lib/ai/copilot";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const result = await runCopilotToolLoop(
      message,
      history || [],
      session.user as any
    );

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Copilot route error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong in the copilot channel." },
      { status: 500 }
    );
  }
}
