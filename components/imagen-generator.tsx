"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ImageIcon,
  Download,
  RefreshCw,
  Calendar,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  generateHealthInfographic,
  createImageBlobUrl,
  downloadInfographic,
  type ImagenRequest,
} from "@/lib/imagen";

interface ImagenGeneratorProps {
  medicationData?: {
    name: string;
    dosage: string;
    frequency: string;
    instructions?: string;
  };
  onGenerated?: (imageUrl: string) => void;
}

export function ImagenGenerator({
  medicationData,
  onGenerated,
}: ImagenGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [imageData, setImageData] = useState<{
    data: string;
    mimeType: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generationType, setGenerationType] = useState<string>("");
  const [isFallback, setIsFallback] = useState<boolean>(false);
  const [modelUsed, setModelUsed] = useState<string>("");

  const handleGenerate = async (
    type: ImagenRequest["type"],
    customPrompt?: string
  ) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedImage(null);
    setImageData(null);

    try {
      let request: ImagenRequest;

      switch (type) {
        case "medication_schedule":
          if (!medicationData) {
            throw new Error(
              "Medication data is required for schedule generation"
            );
          }
          request = {
            prompt: `Medication schedule for ${medicationData.name}`,
            type: "medication_schedule",
            medicationData,
          };
          setGenerationType("Medication Schedule");
          break;

        case "health_progress":
          request = {
            prompt: customPrompt || "Health progress tracking infographic",
            type: "health_progress",
          };
          setGenerationType("Health Progress");
          break;

        case "symptom_tracker":
          request = {
            prompt: customPrompt || "Symptom tracking infographic",
            type: "symptom_tracker",
          };
          setGenerationType("Symptom Tracker");
          break;

        default:
          request = {
            prompt: customPrompt || "Health infographic",
            type: "custom",
          };
          setGenerationType("Custom Infographic");
      }

      const result = await generateHealthInfographic(request);

      if (result.success && result.imageData && result.mimeType) {
        // Handle both SVG and PNG data
        let imageUrl;
        if (result.mimeType === "image/svg+xml") {
          // For SVG, create a data URL directly
          imageUrl = `data:image/svg+xml;base64,${result.imageData}`;
        } else {
          // For other formats, use the blob URL method
          imageUrl = createImageBlobUrl(result.imageData, result.mimeType);
        }

        setGeneratedImage(imageUrl);
        setImageData({ data: result.imageData, mimeType: result.mimeType });
        setIsFallback(result.fallback || false);
        setModelUsed(result.modelUsed || "fallback");

        if (onGenerated) {
          onGenerated(imageUrl);
        }
      } else {
        throw new Error(result.error || "Failed to generate infographic");
      }
    } catch (err) {
      console.error("Generation failed:", err);
      setError(
        err instanceof Error ? err.message : "Failed to generate infographic"
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (imageData) {
      const filename = `health-infographic-${generationType
        .toLowerCase()
        .replace(/\s+/g, "-")}-${Date.now()}.png`;
      downloadInfographic(imageData.data, imageData.mimeType, filename);
    }
  };

  const handleRegenerate = () => {
    if (generationType) {
      const typeMap: Record<string, ImagenRequest["type"]> = {
        "Medication Schedule": "medication_schedule",
        "Health Progress": "health_progress",
        "Symptom Tracker": "symptom_tracker",
        "Custom Infographic": "custom",
      };

      const type = typeMap[generationType] || "custom";
      handleGenerate(type);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          AI Health Infographic Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Generation Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Button
            variant="outline"
            onClick={() => handleGenerate("medication_schedule")}
            disabled={isGenerating || !medicationData}
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Calendar className="w-6 h-6" />
            <span className="text-sm">Medication Schedule</span>
            {!medicationData && (
              <Badge variant="secondary" className="text-xs">
                Requires medication data
              </Badge>
            )}
          </Button>

          <Button
            variant="outline"
            onClick={() => handleGenerate("health_progress")}
            disabled={isGenerating}
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <TrendingUp className="w-6 h-6" />
            <span className="text-sm">Health Progress</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => handleGenerate("symptom_tracker")}
            disabled={isGenerating}
            className="h-auto p-4 flex flex-col items-center gap-2"
          >
            <Activity className="w-6 h-6" />
            <span className="text-sm">Symptom Tracker</span>
          </Button>
        </div>

        {/* Loading State */}
        {isGenerating && (
          <div className="flex items-center justify-center p-8">
            <div className="text-center space-y-3">
              <Loader2 className="w-8 h-8 animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">
                Generating {generationType} infographic...
              </p>
              <p className="text-xs text-muted-foreground">
                This may take a few moments
              </p>
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-sm font-medium text-red-800">
                Generation Failed
              </p>
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Generated Image */}
        {generatedImage && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className="bg-green-50 text-green-800 border-green-200"
              >
                {generationType} Generated
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRegenerate}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Regenerate
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <img
                src={generatedImage}
                alt={`Generated ${generationType.toLowerCase()} infographic`}
                className="w-full h-auto"
                style={{ maxHeight: "500px", objectFit: "contain" }}
              />
            </div>

            <p className="text-sm text-muted-foreground text-center">
              AI-generated health infographic{" "}
              {isFallback
                ? "(Professional Medical Styling)"
                : `using ${modelUsed}`}
            </p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-muted-foreground bg-gray-50 p-3 rounded-lg">
          <p>
            <strong>Note:</strong> This feature uses Google Imagen 4 AI to
            generate professional health infographics. Generated content is for
            informational purposes only and should not replace professional
            medical advice.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
