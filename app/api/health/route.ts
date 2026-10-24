import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Health check endpoint for Cloud Run
    const healthStatus = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: "1.0.0",
      services: {
        gemini: process.env.GOOGLE_AI_API_KEY ? "configured" : "missing",
        database: "ready", // Would check actual database connection
      },
    }

    return NextResponse.json(healthStatus)
  } catch (error) {
    return NextResponse.json(
      {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
