import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

// Get Gemini Pro model for multimodal analysis
export const getGeminiProModel = () => {
  return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
};

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
