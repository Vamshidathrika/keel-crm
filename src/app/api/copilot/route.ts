import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { executeAgentHarness } from "@/lib/agents/harness/runner";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const output = await executeAgentHarness({
      orgId: session.user.orgId,
      agentType: "copilot",
      userPrompt: message,
      targetEntityType: "org",
      targetEntityId: session.user.orgId,
    });

    return NextResponse.json({
      text: output.summary,
      toolsInvoked: output.toolsInvoked,
      thoughtProcess: output.thoughtProcess,
      runId: output.runId,
    });
  } catch (error: any) {
    console.error("Copilot route error:", error);
    return NextResponse.json(
      { error: error.message || "Something went wrong in the copilot channel." },
      { status: 500 }
    );
  }
}
