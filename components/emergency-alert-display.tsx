"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Phone,
  MapPin,
  X,
  Volume2,
  Heart,
  Brain,
  Pill,
  Activity,
} from "lucide-react";
import { useSpeech } from "@/hooks/use-speech";

interface EmergencyData {
  detected: boolean;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  type: "MEDICAL" | "MENTAL_HEALTH" | "MEDICATION" | "VITAL_SIGNS";
  message: string;
  recommendations: string[];
  escalationLevel: number;
  confidence: number;
  locationRequired: boolean;
}

interface EmergencyAlertDisplayProps {
  emergency: EmergencyData;
  onDismiss?: () => void;
  onEmergencyCall?: () => void;
}

export function EmergencyAlertDisplay({
  emergency,
  onDismiss,
  onEmergencyCall,
}: EmergencyAlertDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { speak } = useSpeech();

  if (!emergency.detected) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-600 text-white animate-pulse";
      case "HIGH":
        return "bg-orange-500 text-white";
      case "MODERATE":
        return "bg-yellow-500 text-black";
      case "LOW":
        return "bg-blue-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "MEDICAL":
        return <Heart className="w-6 h-6" />;
      case "MENTAL_HEALTH":
        return <Brain className="w-6 h-6" />;
      case "MEDICATION":
        return <Pill className="w-6 h-6" />;
      case "VITAL_SIGNS":
        return <Activity className="w-6 h-6" />;
      default:
        return <AlertTriangle className="w-6 h-6" />;
    }
  };

  const handleEmergencyCall = () => {
    if (onEmergencyCall) {
      onEmergencyCall();
    } else {
      // Default emergency action
      const confirmCall = confirm(
        "This would dial emergency services in a real implementation. Continue?"
      );
      if (confirmCall) {
        speak("Emergency services would be contacted in a real implementation.");
        alert("Emergency services contacted (demo mode)");
      }
    }
  };

  const handleLocationShare = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          speak("Location shared with emergency services");
          alert(
            `Location shared: ${latitude.toFixed(4)}, ${longitude.toFixed(4)} (demo mode)`
          );
        },
        (error) => {
          console.error("Location error:", error);
          speak("Unable to access location");
        }
      );
    } else {
      speak("Location services not available");
    }
  };

  const speakAlert = () => {
    const alertText = `${emergency.severity} alert detected. ${emergency.message}. Confidence level: ${Math.round(emergency.confidence * 100)} percent. Recommended actions: ${emergency.recommendations.join(", ")}`;
    speak(alertText);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className={`w-full max-w-2xl border-4 ${getSeverityColor(emergency.severity)} border-red-600`}>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-full">
                {getTypeIcon(emergency.type)}
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-red-600 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 animate-pulse" />
                  {emergency.severity} HEALTH ALERT
                </CardTitle>
                <CardDescription className="text-red-700">
                  Confidence: {Math.round(emergency.confidence * 100)}% • Type: {emergency.type.replace("_", " ")}
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={speakAlert}
                className="touch-target"
                aria-label="Listen to alert"
              >
                <Volume2 className="w-4 h-4" />
              </Button>
              {onDismiss && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDismiss}
                  className="touch-target"
                  aria-label="Dismiss alert"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Alert Message */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 font-medium text-lg">{emergency.message}</p>
          </div>

          {/* Severity Badge */}
          <div className="flex items-center gap-2">
            <Badge className={getSeverityColor(emergency.severity)}>
              Escalation Level: {emergency.escalationLevel}/5
            </Badge>
            {emergency.locationRequired && (
              <Badge variant="destructive" className="animate-pulse">
                Location Required
              </Badge>
            )}
          </div>

          {/* Recommendations */}
          <div>
            <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              Immediate Actions Required:
            </h4>
            <ul className="space-y-2">
              {emergency.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-gray-700">
                  <span className="font-bold text-red-600 mt-1">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency Actions */}
          <div className="flex flex-wrap gap-3 pt-4 border-t">
            {emergency.severity === "CRITICAL" && (
              <Button
                onClick={handleEmergencyCall}
                className="touch-target bg-red-600 hover:bg-red-700 text-white animate-pulse"
                size="lg"
              >
                <Phone className="w-4 h-4 mr-2" />
                Call Emergency Services
              </Button>
            )}

            {emergency.locationRequired && (
              <Button
                onClick={handleLocationShare}
                variant="outline"
                className="touch-target border-red-300 text-red-700 hover:bg-red-50"
                size="lg"
              >
                <MapPin className="w-4 h-4 mr-2" />
                Share Location
              </Button>
            )}

            <Button
              onClick={() => window.open("tel:988", "_self")}
              variant="outline"
              className="touch-target border-blue-300 text-blue-700 hover:bg-blue-50"
              size="lg"
            >
              <Phone className="w-4 h-4 mr-2" />
              Crisis Lifeline (988)
            </Button>
          </div>

          {/* Emergency Contacts */}
          <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-lg">
            <p className="font-medium mb-1">Emergency Contacts:</p>
            <p>• 911 - Emergency Services</p>
            <p>• 988 - Suicide & Crisis Lifeline</p>
            <p>• 1-800-222-1222 - Poison Control</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
