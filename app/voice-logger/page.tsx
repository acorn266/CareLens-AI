"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { VoiceRecorder } from "@/components/voice-recorder";
import { apiClient } from "@/lib/api-client";
import { useSpeech } from "@/hooks/use-speech";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Volume2,
  MessageCircle,
} from "lucide-react";
import type { HealthAnalysisResponse } from "@/lib/gemini";
import { formatAnalysisText } from "@/lib/text-formatter";

export default function VoiceLoggerPage() {
  const router = useRouter();
  const { speak, stop } = useSpeech();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<
    (HealthAnalysisResponse & { transcript: string }) | null
  >(null);

  const handleRecordingComplete = (audioBlob: Blob, transcript?: string) => {
    speak(
      "Recording completed successfully. You can now analyze it or record again."
    );
  };

  const handleAnalyze = async (audioBlob: Blob) => {
    setIsAnalyzing(true);
    speak("Analyzing your voice recording. This may take a moment.");

    try {
      const result = await apiClient.analyzeAudio(audioBlob);
      setAnalysis(result);

      // Speak the analysis summary
      const urgencyMessage =
        result.urgency === "Seek Care"
          ? "This may require medical attention."
          : result.urgency === "Monitor"
          ? "Please monitor these symptoms."
          : "These symptoms appear routine.";

      speak(`Analysis complete. ${urgencyMessage}`);
    } catch (error) {
      console.error("Analysis failed:", error);
      speak("Sorry, the analysis failed. Please try again or contact support.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case "Seek Care":
        return "bg-red-100 text-red-800 border-red-200";
      case "Monitor":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getUrgencyIcon = (urgency: string) => {
    switch (urgency) {
      case "Seek Care":
        return <AlertTriangle className="w-4 h-4" />;
      case "Monitor":
        return <Clock className="w-4 h-4" />;
      default:
        return <CheckCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
              className="touch-target"
              aria-label="Go back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground font-work-sans">
                Voice Logger
              </h1>
              <p className="text-sm text-muted-foreground">
                Record and analyze your health symptoms
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-work-sans">How to Use</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>• Speak clearly and describe your symptoms in detail</p>
              <p>• Include when symptoms started, severity, and any triggers</p>
              <p>• Mention any medications you're currently taking</p>
              <p>
                • This tool provides general guidance only - consult a
                healthcare professional for medical advice
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Voice Recorder Component */}
        <VoiceRecorder
          onRecordingComplete={handleRecordingComplete}
          onAnalyze={handleAnalyze}
          isAnalyzing={isAnalyzing}
        />

        {/* Analysis Results */}
        {analysis && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-work-sans">
                  Analysis Results
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => speak(formatAnalysisText(analysis.analysis))}
                  className="touch-target"
                >
                  <Volume2 className="w-4 h-4 mr-2" />
                  Listen
                </Button>
              </div>
              <CardDescription>
                AI-powered assessment of your voice recording
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <Badge className={getUrgencyColor(analysis.urgency)}>
                  {getUrgencyIcon(analysis.urgency)}
                  <span className="ml-1">{analysis.urgency}</span>
                </Badge>
                <Badge variant="outline">
                  Confidence: {analysis.confidence}
                </Badge>
              </div>

              {/* Transcript */}
              {analysis.transcript && (
                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 font-work-sans">
                    Transcript
                  </h4>
                  <p className="text-sm leading-relaxed">
                    {analysis.transcript}
                  </p>
                </div>
              )}

              {/* Analysis Text */}
              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2 font-work-sans">
                  Assessment
                </h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {formatAnalysisText(analysis.analysis)}
                </p>
              </div>

              {/* Follow-up Questions */}
              {analysis.followUpQuestions &&
                analysis.followUpQuestions.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2 font-work-sans">
                      Follow-up Questions
                    </h4>
                    <ul className="space-y-1">
                      {analysis.followUpQuestions.map((question, index) => (
                        <li
                          key={index}
                          className="text-sm text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-primary">•</span>
                          <span>{formatAnalysisText(question)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 font-work-sans">
                    Recommendations
                  </h4>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((rec, index) => (
                      <li
                        key={index}
                        className="text-sm text-muted-foreground flex items-start gap-2"
                      >
                        <span className="text-primary">•</span>
                        <span>{formatAnalysisText(rec)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Important Disclaimer */}
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Important:</strong> This analysis is for informational
                  purposes only and should not replace professional medical
                  advice. Please consult with a healthcare provider for proper
                  diagnosis and treatment.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => setAnalysis(null)}
                  className="touch-target"
                >
                  Record Another Symptom
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    // Stop any ongoing speech before navigation
                    stop();

                    const contextData = {
                      analysis: analysis.analysis,
                      urgency: analysis.urgency,
                      confidence: analysis.confidence,
                      transcript: analysis.transcript,
                      recommendations: analysis.recommendations,
                      followUpQuestions: analysis.followUpQuestions,
                    };
                    const encodedData = encodeURIComponent(
                      JSON.stringify(contextData)
                    );
                    router.push(
                      `/chat?context=true&type=voice%20analysis&data=${encodedData}`
                    );
                  }}
                  className="touch-target"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Discuss with AI Assistant
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
