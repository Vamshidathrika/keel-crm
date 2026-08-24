import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api/auth";
import { executeAgentHarness } from "@/lib/agents/harness/runner";

export async function POST(req: Request) {
  const authResult = await authenticateApiKey(req, "agents:invoke");
  if (!authResult.authorized) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  try {
    const body = await req.json();
    const {
      agentType = "copilot",
      prompt,
      targetEntityType = "org",
      targetEntityId,
      executionMode = "supervised",
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Field 'prompt' is required." }, { status: 400 });
    }

    const orgId = authResult.orgId!;

    const result = await executeAgentHarness({
      orgId,
      agentType,
      userPrompt: prompt,
      targetEntityType,
      targetEntityId: targetEntityId || orgId,
      executionMode,
    });

    return NextResponse.json({
      runId: result.runId,
      status: result.status,
      confidenceScore: result.confidenceScore,
      summary: result.summary,
      thoughtProcess: result.thoughtProcess,
      toolsInvoked: result.toolsInvoked,
      actionsProposed: result.actionsProposed,
      executionDurationMs: result.executionDurationMs,
    });
  } catch (err: any) {
    console.error("Agent invoke error:", err);
    return NextResponse.json({ error: err.message || "Agent execution failed" }, { status: 500 });
  }
}
