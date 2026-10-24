import type { HealthAnalysisResponse } from "./gemini";
import { createSupabaseClient } from "./supabase";

// API client for frontend components
export class MediVisionAPI {
  private baseUrl: string;

  constructor(baseUrl = "/api") {
    this.baseUrl = baseUrl;
  }

  private async getAuthHeaders() {
    const supabase = createSupabaseClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return {
        Authorization: `Bearer ${session.access_token}`,
      };
    }
    return {};
  }

  async analyzeImage(
    imageData: string,
    analysisType: "skin" | "medication" = "skin"
  ): Promise<HealthAnalysisResponse> {
    const authHeaders = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/analyze-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ imageData, analysisType }),
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze image: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Analysis failed");
    }

    return data.analysis;
  }

  async analyzeAudio(
    audioBlob: Blob,
    transcript?: string
  ): Promise<HealthAnalysisResponse & { transcript: string }> {
    const formData = new FormData();
    formData.append("audio", audioBlob);
    if (transcript) {
      formData.append("transcript", transcript);
    }

    const authHeaders = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/analyze-audio`, {
      method: "POST",
      headers: {
        ...authHeaders,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Failed to analyze audio: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Analysis failed");
    }

    return {
      ...data.analysis,
      transcript: data.transcript,
    };
  }

  async sendChatMessage(
    message: string,
    conversationHistory: any[] = [],
    conversationId?: string | null
  ): Promise<{ message: string; emergency?: any; conversationId?: string }> {
    const authHeaders = await this.getAuthHeaders();
    const response = await fetch(`${this.baseUrl}/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ message, conversationHistory, conversationId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to send chat message: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data.success) {
      throw new Error(data.error || "Chat failed");
    }

    return {
      message: data.response,
      emergency: data.analysis?.emergencyAlert,
      conversationId: data.conversationId,
    };
  }

  async startLiveChat(
    message: string,
    sessionId: string
  ): Promise<ReadableStream> {
    const response = await fetch(`${this.baseUrl}/live-chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message, sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Failed to start live chat: ${response.statusText}`);
    }

    return response.body!;
  }

  async checkHealth(): Promise<any> {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }
}

// Export singleton instance
export const apiClient = new MediVisionAPI();
