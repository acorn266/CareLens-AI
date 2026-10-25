import { type NextRequest, NextResponse } from "next/server";
import {
  getGeminiProModel,
  HEALTH_PROMPTS,
  parseHealthAnalysis,
} from "@/lib/gemini";
import { saveHealthRecord } from "@/lib/health-records";
import { isPreviewMode } from "@/lib/preview-mode";
import { MOCK_AI_TEXT } from "@/lib/preview/mock-ai";

export async function POST(request: NextRequest) {
  try {
    const { imageData, analysisType = "skin" } = await request.json();

    if (!imageData) {
      return NextResponse.json(
        { error: "No image data provided" },
        { status: 400 }
      );
    }

    // Local development preview: canned response, no Gemini call or DB write
    if (isPreviewMode) {
      const text =
        analysisType === "medication" ? MOCK_AI_TEXT.medication : MOCK_AI_TEXT.skin;
      return NextResponse.json({
        success: true,
        analysis: parseHealthAnalysis(text),
        rawResponse: text,
        recordId: null,
        saved: false,
        preview: true,
      });
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

    // No keyword-based emergency alert here: the only text is the AI's own
    // analysis, which lists warning signs as advice. The model's structured
    // urgency level (Routine / Monitor / Seek Care) is reported instead.

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
