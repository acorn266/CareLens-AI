import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { emergencyIntelligence } from "@/lib/emergency-intelligence";
import { withModelFallback } from "@/lib/gemini";
import { isPreviewMode } from "@/lib/preview-mode";
import { MOCK_AI_TEXT } from "@/lib/preview/mock-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY!);

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const {
          message,
          conversationHistory = [],
          sessionId,
        } = await request.json();

        if (!message?.trim()) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                error: "No message provided",
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        // Local development preview: canned reply, no Gemini call
        if (isPreviewMode) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "complete",
                response: MOCK_AI_TEXT.chat,
                sessionId,
                preview: true,
              })}\n\n`
            )
          );
          controller.close();
          return;
        }

        // **IMMEDIATE EMERGENCY DETECTION**
        const emergencyAlert = emergencyIntelligence.detectEmergency(message);
        if (emergencyAlert) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "emergency_alert",
                alert: emergencyAlert,
                sessionId,
              })}\n\n`
            )
          );
        }

        // Initialize the model with Live API capabilities
        const createModel = (modelName: string) =>
          genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.9,
            maxOutputTokens: 2048,
          },
          systemInstruction: `You are CareLens AI, a specialized AI healthcare companion designed for elderly and disabled users. 

CORE PRINCIPLES:
- Prioritize user safety and well-being
- Provide clear, actionable health guidance
- Use simple, accessible language
- Never replace professional medical advice
- Encourage seeking medical help when appropriate

CAPABILITIES:
- Analyze health symptoms and concerns
- Provide medication information and reminders
- Offer wellness recommendations
- Support emergency situations with appropriate escalation
- Maintain conversation context for continuous care

EMERGENCY DETECTION:
If you detect any of these, immediately escalate:
- Chest pain or heart-related symptoms
- Difficulty breathing or shortness of breath
- Severe head injury symptoms
- Loss of consciousness
- Severe allergic reactions
- Thoughts of self-harm

RESPONSE FORMAT:
- Start with empathetic acknowledgment
- Provide clear, structured advice
- Include confidence level (High/Medium/Low)
- Suggest follow-up actions
- Offer emergency guidance if needed

Remember: You are a supportive health companion, not a doctor. Always recommend consulting healthcare professionals for serious concerns.`,
        });

        // Build conversation context
        const conversationContext = [
          ...conversationHistory.map((msg: any) => ({
            role: msg.role === "user" ? "user" : "model",
            parts: [{ text: msg.content }],
          })),
          {
            role: "user",
            parts: [{ text: message }],
          },
        ];

        // Start streaming response (falls back on a temporary 429/503 before streaming begins)
        const result = await withModelFallback((modelName) =>
          createModel(modelName)
            .startChat({
              history: conversationContext.slice(0, -1), // All except the current message
            })
            .sendMessageStream(message)
        );

        let fullResponse = "";

        // Process streaming chunks. The AI's text is not scanned for emergency
        // keywords: it routinely lists warning signs as safety advice. Alerts
        // come only from the user's message (checked above, before streaming).
        for await (const chunk of result.stream) {
          const chunkText = chunk.text();
          fullResponse += chunkText;

          // Send partial response
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "chunk",
                content: chunkText,
                sessionId,
                emergencyDetected: !!emergencyAlert,
              })}\n\n`
            )
          );
        }

        // Analyze the complete response for health insights
        const analysisResult = analyzeHealthResponse(
          fullResponse,
          message,
          !!emergencyAlert
        );

        const finalEmergencyAlert = emergencyAlert;

        // Send final analysis
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              response: fullResponse,
              analysis: {
                confidenceLevel: analysisResult.confidence,
                urgencyLevel: analysisResult.urgency,
                isEmergency: !!finalEmergencyAlert,
                emergencyAlert: finalEmergencyAlert,
                recommendations: analysisResult.recommendations,
                followUpQuestions: analysisResult.followUp,
              },
              sessionId,
              timestamp: new Date().toISOString(),
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        console.error("Live chat streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              error: "Failed to process live chat request",
              details: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}

// Health analysis helper function
function analyzeHealthResponse(
  response: string,
  userMessage: string,
  isEmergency: boolean
) {
  // Emergency status comes from the user's own message (see detectEmergency);
  // the AI response is never used to raise it.
  const urgentKeywords = [
    "severe pain",
    "high fever",
    "persistent symptoms",
    "worsening",
    "unusual symptoms",
    "concerning",
    "see doctor soon",
  ];

  const responseText = response.toLowerCase();
  const messageText = userMessage.toLowerCase();

  // Determine urgency level
  let urgency = "Normal";
  if (isEmergency) {
    urgency = "High";
  } else if (urgentKeywords.some((keyword) => messageText.includes(keyword))) {
    urgency = "Medium";
  }

  // Determine confidence level based on specificity
  let confidence = "Medium";
  if (
    isEmergency ||
    responseText.includes("recommend") ||
    responseText.includes("suggest")
  ) {
    confidence = "High";
  } else if (
    responseText.includes("might") ||
    responseText.includes("could") ||
    responseText.includes("possibly")
  ) {
    confidence = "Low";
  }

  // Generate recommendations based on analysis
  const recommendations = generateHealthRecommendations(urgency, isEmergency);

  // Generate follow-up questions
  const followUp = generateFollowUpQuestions(userMessage, urgency);

  return {
    emergency: isEmergency,
    urgency,
    confidence,
    recommendations,
    followUp,
  };
}

function generateHealthRecommendations(
  urgency: string,
  isEmergency: boolean
): string[] {
  if (isEmergency) {
    return [
      "🚨 Seek immediate medical attention or call emergency services",
      "Do not drive yourself - call 911 or have someone drive you",
      "Keep a list of medications and allergies ready",
      "Stay calm and follow emergency dispatcher instructions",
    ];
  }

  if (urgency === "Medium") {
    return [
      "Schedule an appointment with your healthcare provider within 24-48 hours",
      "Monitor symptoms and note any changes",
      "Keep a symptom diary with times and severity",
      "Avoid self-medication unless prescribed",
    ];
  }

  return [
    "Continue monitoring your symptoms",
    "Maintain a healthy lifestyle with proper rest and nutrition",
    "Contact your healthcare provider if symptoms worsen",
    "Keep track of any patterns or triggers",
  ];
}

function generateFollowUpQuestions(
  userMessage: string,
  urgency: string
): string[] {
  const baseQuestions = [
    "How long have you been experiencing these symptoms?",
    "Have you noticed any patterns or triggers?",
    "Are you currently taking any medications?",
    "Have you had similar symptoms before?",
  ];

  if (urgency === "High") {
    return [
      "Are you experiencing chest pain or difficulty breathing right now?",
      "Do you have someone who can assist you or drive you to get help?",
      "Are you able to speak clearly and think clearly?",
      "Do you have your emergency contacts readily available?",
    ];
  }

  return baseQuestions;
}
