import { type NextRequest, NextResponse } from "next/server";
import { getGeminiProModel, HEALTH_PROMPTS } from "@/lib/gemini";
import { saveConversation, updateConversation } from "@/lib/health-records";
import {
  emergencyIntelligence,
  EmergencyAlert,
} from "@/lib/emergency-intelligence";
import { isPreviewMode } from "@/lib/preview-mode";
import { MOCK_AI_TEXT } from "@/lib/preview/mock-ai";

export async function POST(request: NextRequest) {
  try {
    const {
      message,
      conversationHistory = [],
      conversationId = null,
    } = await request.json();

    // Extract auth token from headers
    const authHeader = request.headers.get("Authorization");
    const authToken = authHeader?.replace("Bearer ", "");

    if (!message?.trim()) {
      return NextResponse.json(
        { error: "No message provided" },
        { status: 400 }
      );
    }

    // **EMERGENCY DETECTION** - Check for emergencies first
    const emergencyAlert: EmergencyAlert | null =
      emergencyIntelligence.detectEmergency(message);

    // Local development preview: canned reply, no Gemini call or DB write.
    // Emergency detection still runs locally so its alert UI can be inspected.
    if (isPreviewMode) {
      return NextResponse.json({
        success: true,
        response: MOCK_AI_TEXT.chat,
        conversationHistory: [
          ...conversationHistory,
          { role: "user", content: message },
          { role: "assistant", content: MOCK_AI_TEXT.chat },
        ],
        conversationId: conversationId || null,
        saved: false,
        preview: true,
        analysis: {
          emergency: !!emergencyAlert,
          emergencyAlert: emergencyAlert || null,
        },
      });
    }

    const model = getGeminiProModel();

    // Build conversation context including system prompt
    const conversationContext = [
      HEALTH_PROMPTS.generalHealth,
      // Add conversation history
      ...conversationHistory
        .map(
          (msg: any) =>
            `${msg.role === "user" ? "User" : "Assistant"}: ${msg.content}`
        )
        .join("\n"),
      `User: ${message}`,
    ].join("\n");

    const result = await model.generateContent(conversationContext);
    const response = await result.response;
    const aiResponse = response.text();

    // Alerts come only from what the user said. The AI's reply is not scanned:
    // it routinely lists warning signs as safety advice ("seek care if...").
    const finalEmergencyAlert: EmergencyAlert | null = emergencyAlert;

    // Prepare updated conversation history
    const newMessage = {
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    };
    const aiMessage = {
      role: "assistant",
      content: aiResponse,
      timestamp: new Date().toISOString(),
    };
    const updatedHistory = [...conversationHistory, newMessage, aiMessage];

    // Save or update conversation in database
    try {
      let savedConversation;

      if (conversationId) {
        // Update existing conversation
        savedConversation = await updateConversation(
          conversationId,
          updatedHistory,
          authToken
        );
      } else {
        // Create new conversation with title based on first message
        const title =
          message.length > 50 ? message.substring(0, 50) + "..." : message;
        savedConversation = await saveConversation(
          `Health Chat: ${title}`,
          updatedHistory,
          authToken
        );
      }

      // Conversation already saved above, no need to save again

      return NextResponse.json({
        success: true,
        response: aiResponse,
        conversationHistory: updatedHistory,
        conversationId: savedConversation.id,
        saved: true,
        analysis: {
          emergency: finalEmergencyAlert ? true : false,
          emergencyAlert: finalEmergencyAlert || null,
        },
      });
    } catch (saveError) {
      // If saving fails, still return response but indicate it wasn't saved
      console.error("Failed to save conversation:", saveError);

      return NextResponse.json({
        success: true,
        response: aiResponse,
        conversationHistory: updatedHistory,
        conversationId: conversationId || null,
        saved: false,
        saveError:
          "Could not save conversation. Please ensure you are signed in.",
        analysis: {
          emergency: finalEmergencyAlert ? true : false,
          emergencyAlert: finalEmergencyAlert || null,
        },
      });
    }
  } catch (error) {
    console.error("Error in health chat:", error);
    return NextResponse.json(
      {
        error: "Failed to process chat message",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
