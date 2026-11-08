import { NextRequest, NextResponse } from "next/server";
import { executeMCPTool } from "@/lib/mcp";

export async function POST(req: NextRequest) {
  try {
    const { toolName, parameters } = await req.json();

    if (!toolName) {
      return NextResponse.json(
        { success: false, error: "toolName is required" },
        { status: 400 }
      );
    }

    const result = await executeMCPTool({
      toolName,
      parameters: parameters || {},
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "MCP dispatch failed",
      },
      { status: 500 }
    );
  }
}
