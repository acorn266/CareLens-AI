"use client";

import { useState, useEffect, useRef } from "react";
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
import { CameraCapture } from "@/components/camera-capture";
import { apiClient } from "@/lib/api-client";
import { useSpeech } from "@/hooks/use-speech";
import {
  formatAnalysisText,
  parseAnalysisSections,
} from "@/lib/text-formatter";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  Volume2,
  Square,
  Play,
  Pause,
  Camera,
  Video,
  Upload,
} from "lucide-react";
import type { HealthAnalysisResponse } from "@/lib/gemini";

export default function SkinAnalysisPage() {
  const router = useRouter();
  const { speak, hasError, isSpeaking, isPaused, pause, resume, stop } =
    useSpeech();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<HealthAnalysisResponse | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [analysisMode, setAnalysisMode] = useState<"image" | "video">("image");
  const [selectedVideo, setSelectedVideo] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cleanup video preview URL when component unmounts
  useEffect(() => {
    return () => {
      if (videoPreview) {
        URL.revokeObjectURL(videoPreview);
      }
    };
  }, [videoPreview]);

  // Force video to load when videoPreview changes
  useEffect(() => {
    if (videoPreview && videoRef.current) {
      console.log("🎥 Forcing video to load:", videoPreview);
      videoRef.current.load();
    }
  }, [videoPreview]);

  const handleImageCapture = (imageData: string) => {
    setCapturedImage(imageData);
    speak(
      "Photo captured successfully. You can now analyze it or take another photo."
    );
  };

  const handleAnalyze = async (imageData: string) => {
    setIsAnalyzing(true);
    speak("Analyzing your photo. This may take a moment.");

    try {
      const result = await apiClient.analyzeImage(imageData, "skin");
      setAnalysis(result);

      // Speak the analysis summary
      const urgencyMessage =
        result.urgency === "Seek Care"
          ? "This requires medical attention."
          : result.urgency === "Monitor"
          ? "Please monitor this area."
          : "This appears routine.";

      speak(
        `Analysis complete. Confidence level: ${result.confidence}. ${urgencyMessage}`
      );
    } catch (error) {
      console.error("Analysis failed:", error);
      speak("Sorry, the analysis failed. Please try again or contact support.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVideoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log("🎥 Video file selected:", {
        name: file.name,
        type: file.type,
        size: file.size,
      });

      setSelectedVideo(file);

      // Create object URL for video preview
      const url = URL.createObjectURL(file);
      console.log("🎥 Video preview URL created:", url);
      setVideoPreview(url);

      speak("Video selected successfully. You can now analyze it.");
    }
  };

  const handleVideoAnalyze = async () => {
    if (!selectedVideo) return;

    setIsAnalyzing(true);
    speak("Analyzing your video. This may take a moment.");

    try {
      const formData = new FormData();
      formData.append("video", selectedVideo);
      formData.append("analysisType", "skin");

      const response = await fetch("/api/analyze-video", {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${localStorage.getItem(
            "supabase.auth.token"
          )}`,
        },
      });

      if (!response.ok) {
        throw new Error("Video analysis failed");
      }

      const result = await response.json();
      setAnalysis(result.structured);

      // Speak the analysis summary
      const urgencyMessage =
        result.structured.urgency === "Seek Care"
          ? "This requires medical attention."
          : result.structured.urgency === "Monitor"
          ? "Please monitor this area."
          : "This appears routine.";

      speak(
        `Video analysis complete. Confidence level: ${result.structured.confidence}. ${urgencyMessage}`
      );
    } catch (error) {
      console.error("Video analysis failed:", error);
      speak(
        "Sorry, the video analysis failed. Please try again or contact support."
      );
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
                Skin Analysis
              </h1>
              <p className="text-sm text-muted-foreground">
                AI-powered skin health assessment
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Analysis Mode Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="font-work-sans">Analysis Mode</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button
                variant={analysisMode === "image" ? "default" : "outline"}
                onClick={() => setAnalysisMode("image")}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Image Analysis
              </Button>
              <Button
                variant={analysisMode === "video" ? "default" : "outline"}
                onClick={() => setAnalysisMode("video")}
                className="flex-1"
              >
                <Video className="w-4 h-4 mr-2" />
                Video Analysis
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle className="font-work-sans">
              {analysisMode === "image" ? "Image Analysis" : "Video Analysis"} -
              How to Use
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm text-muted-foreground">
              {analysisMode === "image" ? (
                <>
                  <p>
                    • Take a clear, well-lit photo of the area you want to
                    analyze
                  </p>
                  <p>• Ensure the area fills most of the frame</p>
                  <p>• Avoid shadows and reflections</p>
                </>
              ) : (
                <>
                  <p>
                    • Record a clear, well-lit video of the area you want to
                    analyze
                  </p>
                  <p>• Keep the camera steady and ensure good lighting</p>
                  <p>• Show the area from different angles if possible</p>
                  <p>• Maximum file size: 25MB</p>
                </>
              )}
              <p>
                • This tool provides general guidance only - consult a
                healthcare professional for medical advice
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Analysis Component */}
        {analysisMode === "image" ? (
          <CameraCapture
            onCapture={handleImageCapture}
            onAnalyze={handleAnalyze}
            isAnalyzing={isAnalyzing}
          />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="font-work-sans">Video Upload</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center space-y-2"
                >
                  <Upload className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm font-medium">
                    {selectedVideo ? "Change Video" : "Select Video File"}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    MP4, MOV, AVI (max 25MB)
                  </span>
                </label>
              </div>

              {videoPreview && (
                <div className="space-y-4">
                  <div className="relative">
                    <video
                      ref={videoRef}
                      key={videoPreview}
                      src={videoPreview}
                      controls
                      className="w-full max-w-md mx-auto rounded-lg border-2 border-border"
                      onLoadedData={() => {
                        console.log("🎥 Video loaded successfully");
                        if (videoRef.current) {
                          console.log("🎥 Video dimensions:", {
                            videoWidth: videoRef.current.videoWidth,
                            videoHeight: videoRef.current.videoHeight,
                            duration: videoRef.current.duration,
                          });
                        }
                      }}
                      onError={(e) => {
                        console.error("🎥 Video load error:", e);
                        if (videoRef.current) {
                          console.error(
                            "🎥 Video error details:",
                            videoRef.current.error
                          );
                        }
                      }}
                      onCanPlay={() => console.log("🎥 Video can play")}
                      onLoadStart={() => console.log("🎥 Video load started")}
                      preload="metadata"
                      playsInline
                      muted={false}
                      crossOrigin="anonymous"
                      poster=""
                      style={{
                        minHeight: "200px",
                        maxHeight: "400px",
                        objectFit: "contain",
                        backgroundColor: "#000",
                        display: "block",
                        width: "100%",
                        height: "auto",
                      }}
                    />
                  </div>
                  <Button
                    onClick={handleVideoAnalyze}
                    disabled={isAnalyzing}
                    className="w-full"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                        Analyzing Video...
                      </>
                    ) : (
                      <>
                        <Video className="w-4 h-4 mr-2" />
                        Analyze Video
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Analysis Results */}
        {analysis && (
          <Card className="border-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="font-work-sans">
                  Analysis Results
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (isPaused) {
                        resume();
                      } else {
                        console.log(
                          "Listen button clicked, analysis text:",
                          analysis.analysis
                        );
                        speak(formatAnalysisText(analysis.analysis));
                      }
                    }}
                    className="touch-target"
                    disabled={isSpeaking && !isPaused}
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-4 h-4 mr-2" />
                        {isSpeaking
                          ? "Speaking..."
                          : hasError
                          ? "Retry Listen"
                          : "Listen"}
                      </>
                    )}
                  </Button>
                  {isSpeaking && !isPaused && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={pause}
                      className="touch-target"
                    >
                      <Pause className="w-4 h-4 mr-2" />
                      Pause
                    </Button>
                  )}
                  {(isSpeaking || isPaused) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={stop}
                      className="touch-target"
                    >
                      <Square className="w-4 h-4 mr-2" />
                      Stop
                    </Button>
                  )}
                </div>
              </div>
              <CardDescription>
                AI-powered assessment based on your photo
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

              {/* Analysis Text */}
              <div className="bg-white p-6 rounded-lg border border-gray-200">
                <h4 className="text-xl font-semibold mb-4 text-gray-800">
                  Assessment
                </h4>
                <div className="prose prose-gray max-w-none">
                  <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                    {formatAnalysisText(analysis.analysis)}
                  </p>
                </div>
              </div>

              {/* Recommendations */}
              {analysis.recommendations.length > 0 && (
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h4 className="text-xl font-semibold mb-4 text-gray-800">
                    Recommendations
                  </h4>
                  <ul className="space-y-3">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="text-gray-700 leading-relaxed">
                        {formatAnalysisText(rec)}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Important Disclaimer */}
              <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                <p className="text-sm text-gray-600">
                  <strong>Important:</strong> This analysis is for informational
                  purposes only and should not replace professional medical
                  advice. Please consult with a healthcare provider for proper
                  diagnosis and treatment.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => {
                    setAnalysis(null);
                    setCapturedImage(null);
                  }}
                  className="touch-target"
                >
                  Analyze Another Photo
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
                      recommendations: analysis.recommendations,
                      followUpQuestions: analysis.followUpQuestions,
                      analysisMode: analysisMode,
                      hasImage: !!capturedImage,
                      hasVideo: !!selectedVideo,
                    };
                    const encodedData = encodeURIComponent(
                      JSON.stringify(contextData)
                    );
                    router.push(
                      `/chat?context=true&type=skin%20analysis&data=${encodedData}`
                    );
                  }}
                  className="touch-target"
                >
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
