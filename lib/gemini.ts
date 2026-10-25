import {
  GoogleGenerativeAI,
  GoogleGenerativeAIFetchError,
  type GenerativeModel,
} from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Primary model, overridable with the optional GEMINI_MODEL env var
export const GEMINI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";

// Used only when the primary model is temporarily busy or rate limited
export const GEMINI_FALLBACK_MODEL = "gemini-3.5-flash-lite";

const TRANSIENT_STATUSES = [429, 503];

// Runs `call` with the primary model and retries once with the fallback model
// on a temporary 429/503. Any other error is thrown unchanged. Callers must do
// their own validation, auth and safety checks before calling this.
export async function withModelFallback<T>(
  call: (modelName: string) => Promise<T>
): Promise<T> {
  try {
    return await call(GEMINI_MODEL);
  } catch (error) {
    const status =
      error instanceof GoogleGenerativeAIFetchError ? error.status : undefined;
    if (
      status === undefined ||
      !TRANSIENT_STATUSES.includes(status) ||
      GEMINI_MODEL === GEMINI_FALLBACK_MODEL
    ) {
      throw error;
    }
    console.warn(
      `Gemini model ${GEMINI_MODEL} returned ${status}; retrying with ${GEMINI_FALLBACK_MODEL}`
    );
    return call(GEMINI_FALLBACK_MODEL);
  }
}

// Get the Gemini model for multimodal analysis (with transient-error fallback)
export const getGeminiProModel = (): Pick<GenerativeModel, "generateContent"> => ({
  generateContent: (request) =>
    withModelFallback((model) =>
      genAI.getGenerativeModel({ model }).generateContent(request)
    ),
});

// Health analysis prompt templates
export const HEALTH_PROMPTS = {
  skinAnalysis: `You are a medical AI assistant analyzing a skin image. Please provide:

1. **Visual Assessment**: Describe what you observe in the image
2. **Potential Concerns**: List any areas that might need attention (be cautious and non-diagnostic)
3. **Confidence Level**: Rate your confidence (Low/Medium/High)
4. **Recommendations**: Suggest next steps (always recommend consulting healthcare professionals for concerns)
5. **Urgency Level**: Classify as Routine, Monitor, or Seek Care

Important: You are not providing medical diagnosis. Always recommend consulting healthcare professionals for proper evaluation.

Image Analysis:`,

  voiceAnalysis: `You are a medical AI assistant analyzing voice/audio for health symptoms. Please provide:

1. **Transcript Review**: Summarize the key health concerns mentioned
2. **Symptom Extraction**: List specific symptoms mentioned
3. **Emotional Tone**: Assess the speaker's emotional state (calm, anxious, distressed)
4. **Urgency Assessment**: Classify as Routine, Monitor, or Seek Care
5. **Follow-up Questions**: Suggest relevant questions to ask
6. **Recommendations**: Next steps (always recommend healthcare professional consultation for concerns)

Important: This is not medical diagnosis. Always recommend consulting healthcare professionals.

Audio Analysis:`,

  medicationAnalysis: `You are a medical AI assistant analyzing medication information. Please provide:

1. **Medication Identification**: Name and details of the medication
2. **Usage Information**: Dosage, frequency, and administration
3. **Common Side Effects**: List potential side effects to monitor
4. **Interactions**: Note if there are common drug interactions to be aware of
5. **Storage Instructions**: How to properly store the medication
6. **Safety Notes**: Important safety considerations

Important: This is informational only. Always consult healthcare professionals or pharmacists for medication guidance.

Medication Analysis:`,

  generalHealth: `You are a compassionate medical AI assistant. Provide helpful, accurate health information while:

1. Being empathetic and supportive
2. Never providing definitive medical diagnoses
3. Always recommending professional medical consultation when appropriate
4. Focusing on general health education and wellness
5. Encouraging healthy lifestyle choices
6. Being culturally sensitive and inclusive

Remember: You are a supportive companion, not a replacement for professional medical care.

Health Question:`,

  videoAnalysis: `You are a medical AI assistant analyzing a health-related video. Please provide:

1. **Visual Assessment**: Describe what you observe in the video (movement, posture, facial expressions, skin conditions, etc.)
2. **Movement Analysis**: Assess gait, balance, coordination, tremors, or other physical indicators
3. **Behavioral Indicators**: Note any signs of pain, discomfort, confusion, or distress
4. **Potential Concerns**: List any areas that might need medical attention (be cautious and non-diagnostic)
5. **Confidence Level**: Rate your confidence (Low/Medium/High)
6. **Recommendations**: Suggest next steps (always recommend consulting healthcare professionals for concerns)
7. **Urgency Level**: Classify as Routine, Monitor, or Seek Care

Important: You are not providing medical diagnosis. Always recommend consulting healthcare professionals for proper evaluation.

Video Analysis:`,
};

// Convert image to base64 for Gemini
export const imageToBase64 = async (
  imageFile: File | Blob
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(imageFile);
  });
};

// Convert audio to base64 for Gemini
export const audioToBase64 = async (audioBlob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(audioBlob);
  });
};

// Convert video to base64 for Gemini
export const videoToBase64 = async (
  videoFile: File | Blob
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(videoFile);
  });
};

// Health analysis response type
export interface HealthAnalysisResponse {
  analysis: string;
  confidence: "Low" | "Medium" | "High";
  urgency: "Routine" | "Monitor" | "Seek Care";
  recommendations: string[];
  followUpQuestions?: string[];
  emergency?: {
    detected: boolean;
    severity: string;
    type: string;
    message: string;
    recommendations: string[];
    escalationLevel: number;
    confidence: number;
    locationRequired: boolean;
  };
  timestamp: string;
}

// Parse Gemini response into structured format
export const parseHealthAnalysis = (
  response: string
): HealthAnalysisResponse => {
  const lines = response.split("\n").filter((line) => line.trim());

  let confidence: "Low" | "Medium" | "High" = "Medium";
  let urgency: "Routine" | "Monitor" | "Seek Care" = "Routine";
  const recommendations: string[] = [];

  // Extract confidence level
  const confidenceLine = lines.find((line) =>
    line.toLowerCase().includes("confidence")
  );
  if (confidenceLine) {
    if (confidenceLine.toLowerCase().includes("high")) confidence = "High";
    else if (confidenceLine.toLowerCase().includes("low")) confidence = "Low";
  }

  // Extract urgency level
  const urgencyLine = lines.find((line) =>
    line.toLowerCase().includes("urgency")
  );
  if (urgencyLine) {
    if (urgencyLine.toLowerCase().includes("seek care")) urgency = "Seek Care";
    else if (urgencyLine.toLowerCase().includes("monitor")) urgency = "Monitor";
  }

  // Extract recommendations
  const recStart = lines.findIndex((line) =>
    line.toLowerCase().includes("recommendation")
  );
  if (recStart !== -1) {
    for (let i = recStart + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.toLowerCase().includes("important:")) {
        recommendations.push(
          line.replace(/^\d+\.\s*/, "").replace(/^[-*]\s*/, "")
        );
      }
    }
  }

  return {
    analysis: response,
    confidence,
    urgency,
    recommendations: recommendations.slice(0, 5), // Limit to 5 recommendations
    timestamp: new Date().toISOString(),
  };
};
