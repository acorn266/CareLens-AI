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
    const formData = await request.formData();
    const audioFile = formData.get("audio") as File;
    const transcript = formData.get("transcript") as string;

    if (!audioFile && !transcript) {
      return NextResponse.json(
        { error: "No audio file or transcript provided" },
        { status: 400 }
      );
    }

    const model = getGeminiProModel();
    let analysisText: string;
    let audioData: string | null = null;

    if (audioFile) {
      // Convert audio to base64
      const arrayBuffer = await audioFile.arrayBuffer();
      const base64Audio = Buffer.from(arrayBuffer).toString("base64");
      audioData = base64Audio;

      const result = await model.generateContent([
        HEALTH_PROMPTS.voiceAnalysis,
        {
          inlineData: {
            data: base64Audio,
            mimeType: audioFile.type || "audio/webm",
          },
        },
      ]);

      const response = await result.response;
      analysisText = response.text();
    } else {
      // Analyze transcript only
      const result = await model.generateContent([
        HEALTH_PROMPTS.voiceAnalysis,
        `Transcript: "${transcript}"`,
      ]);

      const response = await result.response;
      analysisText = response.text();
    }

    // **EMERGENCY DETECTION** - Check transcript for emergencies
    let emergencyAlert: EmergencyAlert | null = null;
    if (transcript) {
      emergencyAlert = emergencyIntelligence.detectEmergency(transcript);
    }

    // Parse the response into structured format
    const structuredAnalysis = parseHealthAnalysis(analysisText);

    // Extract follow-up questions from the analysis
    const followUpQuestions = extractFollowUpQuestions(analysisText);
    structuredAnalysis.followUpQuestions = followUpQuestions;

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
          type: "voice_log",
          title: `Voice Symptom Log - ${new Date().toLocaleDateString()}`,
          data: {
            transcript: transcript || "Audio analysis without transcript",
            audioFileName: audioFile?.name,
            audioSize: audioFile?.size,
            audioType: audioFile?.type,
            hasAudioFile: !!audioFile,
            analysisMethod: audioFile
              ? "audio_and_transcript"
              : "transcript_only",
          },
          analysisResult: structuredAnalysis,
          audioUrl: audioData
            ? `data:${
                audioFile?.type || "audio/webm"
              };base64,${audioData.substring(0, 100)}...`
            : undefined,
        },
        authToken
      );

      return NextResponse.json({
        success: true,
        analysis: structuredAnalysis,
        rawResponse: analysisText,
        transcript: transcript || "Audio analysis without transcript",
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
        transcript: transcript || "Audio analysis without transcript",
        saved: false,
        saveError:
          "Could not save to database. Please ensure you are signed in.",
      });
    }
  } catch (error) {
    console.error("Error analyzing audio:", error);
    return NextResponse.json(
      {
        error: "Failed to analyze audio",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

function extractFollowUpQuestions(analysisText: string): string[] {
  const questions: string[] = [];
  const lines = analysisText.split("\n");

  let inQuestionSection = false;
  for (const line of lines) {
    if (
      line.toLowerCase().includes("follow-up") ||
      line.toLowerCase().includes("questions")
    ) {
      inQuestionSection = true;
      continue;
    }

    if (inQuestionSection && line.trim()) {
      if (line.includes("?")) {
        questions.push(
          line
            .replace(/^\d+\.\s*/, "")
            .replace(/^[-*]\s*/, "")
            .trim()
        );
      }

      if (questions.length >= 5) break; // Limit to 5 questions
    }
  }

  return questions;
}
