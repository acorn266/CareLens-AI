import { NextRequest, NextResponse } from "next/server";
import {
  getGeminiProModel,
  HEALTH_PROMPTS,
  parseHealthAnalysis,
} from "@/lib/gemini";
import { saveHealthRecord } from "@/lib/health-records";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File;
    const analysisType = (formData.get("analysisType") as string) || "general";
    const authToken = request.headers.get("authorization");

    console.log("🎥 Video analysis request received");
    console.log("📁 Video file:", videoFile ? {
      name: videoFile.name,
      type: videoFile.type,
      size: videoFile.size
    } : "No file");
    console.log("🔍 Analysis type:", analysisType);

    if (!videoFile) {
      console.error("❌ No video file provided");
      return NextResponse.json(
        { error: "No video file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!videoFile.type.startsWith("video/")) {
      console.error("❌ Invalid file type:", videoFile.type);
      return NextResponse.json(
        { error: `File must be a video. Received: ${videoFile.type}` },
        { status: 400 }
      );
    }

    // Validate file size (max 25MB for better video support)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (videoFile.size > maxSize) {
      console.error("❌ File too large:", videoFile.size, "bytes");
      return NextResponse.json(
        { error: `Video file too large. Maximum size is 25MB. Received: ${Math.round(videoFile.size / 1024 / 1024)}MB` },
        { status: 400 }
      );
    }

    console.log(
      `🎥 Analyzing video: ${videoFile.name}, Type: ${videoFile.type}, Size: ${videoFile.size} bytes`
    );

    // Convert video to base64 using Node.js compatible method
    const videoBuffer = await videoFile.arrayBuffer();
    const videoBase64 = Buffer.from(videoBuffer).toString('base64');

    // Get the appropriate prompt based on analysis type
    let prompt = HEALTH_PROMPTS.videoAnalysis;
    if (analysisType === "movement") {
      prompt = `Focus on movement analysis: gait, balance, coordination, tremors, and physical mobility indicators. ${HEALTH_PROMPTS.videoAnalysis}`;
    } else if (analysisType === "skin") {
      prompt = `Focus on skin condition analysis: visible skin issues, rashes, moles, or dermatological concerns. ${HEALTH_PROMPTS.videoAnalysis}`;
    } else if (analysisType === "behavioral") {
      prompt = `Focus on behavioral indicators: signs of pain, confusion, distress, or cognitive changes. ${HEALTH_PROMPTS.videoAnalysis}`;
    }

    // Initialize Gemini model (using 2.5 Flash for competition compliance)
    const model = getGeminiProModel();

    // Generate content with video using Gemini 2.5 Flash (competition compliant)
    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: videoBase64,
          mimeType: videoFile.type,
        },
      },
    ]);

    const analysisText = result.response.text();
    console.log("🎥 Video analysis completed successfully");

    // Parse the analysis into structured format
    const structuredAnalysis = parseHealthAnalysis(analysisText);

    // Save to health records if user is authenticated
    let savedRecord = null;
    if (authToken) {
      try {
        savedRecord = await saveHealthRecord(
          {
            type: "video_analysis",
            title: `Video Analysis - ${analysisType}`,
            content: analysisText,
            metadata: {
              analysisType,
              fileName: videoFile.name,
              fileSize: videoFile.size,
              fileType: videoFile.type,
              confidence: structuredAnalysis.confidence,
              urgency: structuredAnalysis.urgency,
            },
            timestamp: new Date().toISOString(),
          },
          authToken
        );
        console.log("💾 Video analysis saved to health records");
      } catch (error) {
        console.error("❌ Error saving video analysis:", error);
        // Continue without saving if there's an error
      }
    }

    return NextResponse.json({
      success: true,
      analysis: analysisText,
      structured: structuredAnalysis,
      recordId: savedRecord?.id || null,
      saved: !!savedRecord,
      metadata: {
        fileName: videoFile.name,
        fileSize: videoFile.size,
        fileType: videoFile.type,
        analysisType,
      },
    });
  } catch (error) {
    console.error("❌ Video analysis error:", error);

    // Handle specific Gemini API errors
    if (error instanceof Error) {
      if (error.message.includes("quota")) {
        return NextResponse.json(
          { error: "API quota exceeded. Please try again later." },
          { status: 429 }
        );
      }
      if (error.message.includes("invalid")) {
        return NextResponse.json(
          { error: "Invalid video format. Please try a different video file." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to analyze video. Please try again." },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "video-analysis",
    timestamp: new Date().toISOString(),
    features: [
      "Video health analysis",
      "Movement assessment",
      "Behavioral indicators",
      "Skin condition analysis",
      "Emergency detection",
    ],
  });
}
