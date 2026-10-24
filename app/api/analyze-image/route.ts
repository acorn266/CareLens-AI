import { type NextRequest, NextResponse } from "next/server";
import {
  getGeminiProModel,
  HEALTH_PROMPTS,
  parseHealthAnalysis,
} from "@/lib/gemini";
import { saveHealthRecord } from "@/lib/health-records";
import {
  emergencyIntelligence,
  EmergencyAlert,
} from "@/lib/emergency-intelligence";

export async function POST(request: NextRequest) {
  try {
    const { imageData, analysisType = "skin" } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    // Remove data URL prefix if present
    const base64Image = imageData.replace(/^data:image\/[a-z]+;base64,/, "");

    const model = getGeminiProModel();

    // Select appropriate prompt based on analysis type
    const prompt =
      analysisType === "medication"
        ? HEALTH_PROMPTS.medicationAnalysis
        : HEALTH_PROMPTS.skinAnalysis;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: "image/jpeg",
        },
      },
    ]);

    const response = await result.response;
    const analysisText = response.text();

    // Parse the response into structured format
    const structuredAnalysis = parseHealthAnalysis(analysisText);

    // **EMERGENCY DETECTION** - Check analysis results for emergencies
    let emergencyAlert: EmergencyAlert | null = null;
    if (analysisText) {
      emergencyAlert = emergencyIntelligence.detectEmergency(analysisText);
    }

    // Add emergency information to analysis if detected
    if (emergencyAlert) {
      structuredAnalysis.emergency = {
        detected: true,
        severity: emergencyAlert.severity,
        type: emergencyAlert.type,
        message: emergencyAlert.message,
        recommendations: emergencyAlert.recommendations,
        escalationLevel: emergencyAlert.escalationLevel,
        confidence: emergencyAlert.confidence,
        locationRequired: emergencyAlert.locationRequired,
      };
    }

    // Save to database if user is authenticated
    try {
      // Extract auth token from request headers
      const authHeader = request.headers.get("authorization");
      const authToken = authHeader?.replace("Bearer ", "");

      const savedRecord = await saveHealthRecord(
        {
          type:
            analysisType === "medication" ? "medication_scan" : "skin_analysis",
          title: `${
            analysisType === "medication" ? "Medication" : "Skin"
          } Analysis - ${new Date().toLocaleDateString()}`,
          data: {
            analysisType,
            imageData: base64Image.substring(0, 100) + "...", // Store truncated version for reference
            originalSize: base64Image.length,
          },
          analysisResult: structuredAnalysis,
        },
        authToken
      );

      return NextResponse.json({
        success: true,
        analysis: structuredAnalysis,
        rawResponse: analysisText,
        recordId: savedRecord?.id || null,
        saved: !!savedRecord,
      });
    } catch (saveError) {
      // If saving fails, still return analysis but indicate it wasn't saved
      console.error("Failed to save health record:", saveError);

      return NextResponse.json({
        success: true,
        analysis: structuredAnalysis,
        rawResponse: analysisText,
        saved: false,
        saveError:
          "Could not save to database. Please ensure you are signed in.",
      });
    }
  } catch (error) {
    console.error("Error analyzing image:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
