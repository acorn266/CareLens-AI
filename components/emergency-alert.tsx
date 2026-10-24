"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Phone,
  MapPin,
  Clock,
  Heart,
  X,
  ExternalLink,
} from "lucide-react";
import {
  EmergencyAlert,
  formatEmergencyAlert,
} from "@/lib/emergency-intelligence";

interface EmergencyAlertProps {
  alert: EmergencyAlert;
  onDismiss?: () => void;
  onCallEmergency?: () => void;
  onShareLocation?: () => void;
}

export function EmergencyAlertComponent({
  alert,
  onDismiss,
  onCallEmergency,
  onShareLocation,
}: EmergencyAlertProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "CRITICAL":
        return "bg-red-600 text-white border-red-700";
      case "HIGH":
        return "bg-orange-500 text-white border-orange-600";
      case "MODERATE":
        return "bg-yellow-500 text-black border-yellow-600";
      case "LOW":
        return "bg-blue-500 text-white border-blue-600";
      default:
        return "bg-gray-500 text-white border-gray-600";
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "MEDICAL":
        return <Heart className="h-5 w-5" />;
      case "VITAL_SIGNS":
        return <Heart className="h-5 w-5 text-red-500" />;
      case "MENTAL_HEALTH":
        return <AlertTriangle className="h-5 w-5 text-purple-500" />;
      case "MEDICATION":
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <AlertTriangle className="h-5 w-5" />;
    }
  };

  if (!isExpanded) {
    return (
      <div
        className={`fixed top-4 right-4 z-50 p-2 rounded-md ${getSeverityColor(
          alert.severity
        )} cursor-pointer`}
        onClick={() => setIsExpanded(true)}
      >
        <div className="flex items-center space-x-2">
          {getTypeIcon(alert.type)}
          <span className="text-sm font-bold">{alert.severity} ALERT</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <Card
        className={`w-full max-w-md border-2 ${getSeverityColor(
          alert.severity
        )} animate-pulse shadow-2xl`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {getTypeIcon(alert.type)}
              <CardTitle className="text-lg font-bold">
                🚨 {alert.severity} ALERT
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center space-x-2 text-sm opacity-90">
            <Clock className="h-4 w-4" />
            <span>{alert.timestamp.toLocaleString()}</span>
            <Badge variant="secondary" className="ml-2">
              {Math.round(alert.confidence * 100)}% Confidence
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Alert Message */}
          <div className="p-3 bg-white bg-opacity-10 rounded-md">
            <p className="font-semibold text-sm">{alert.message}</p>
          </div>

          {/* Symptoms */}
          {alert.symptoms.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Detected Symptoms:</h4>
              <ul className="text-sm space-y-1">
                {alert.symptoms.map((symptom, index) => (
                  <li key={index} className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-current rounded-full"></span>
                    <span>{symptom}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          <div>
            <h4 className="font-semibold text-sm mb-2">Recommended Actions:</h4>
            <ul className="text-sm space-y-1">
              {alert.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start space-x-2">
                  <span className="w-2 h-2 bg-current rounded-full mt-1.5"></span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Emergency Actions */}
          <div className="pt-3 border-t border-white border-opacity-20">
            <div className="grid grid-cols-2 gap-2">
              {alert.severity === "CRITICAL" && (
                <Button
                  onClick={onCallEmergency}
                  className="bg-red-600 hover:bg-red-700 text-white"
                  size="sm"
                >
                  <Phone className="h-4 w-4 mr-1" />
                  Call 911
                </Button>
              )}

              {alert.locationRequired && (
                <Button onClick={onShareLocation} variant="secondary" size="sm">
                  <MapPin className="h-4 w-4 mr-1" />
                  Share Location
                </Button>
              )}

              <Button
                onClick={() => window.open("tel:988", "_blank")}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                Crisis Line 988
              </Button>

              <Button
                onClick={() => window.open("https://www.poison.org/", "_blank")}
                variant="outline"
                size="sm"
                className="text-xs"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Poison Control
              </Button>
            </div>
          </div>

          {/* Dismiss Button */}
          {onDismiss && alert.severity !== "CRITICAL" && (
            <Button
              onClick={onDismiss}
              variant="ghost"
              size="sm"
              className="w-full mt-3"
            >
              I understand - Dismiss Alert
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Emergency Alert Manager Component
interface EmergencyAlertManagerProps {
  alerts: EmergencyAlert[];
  onDismissAlert: (alertId: string) => void;
}

export function EmergencyAlertManager({
  alerts,
  onDismissAlert,
}: EmergencyAlertManagerProps) {
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(
    new Set()
  );

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts((prev) => new Set(prev).add(alertId));
    onDismissAlert(alertId);
  };

  const handleCallEmergency = () => {
    if (typeof window !== "undefined") {
      window.location.href = "tel:911";
    }
  };

  const handleShareLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const mapsUrl = `https://maps.google.com/?q=${latitude},${longitude}`;
          console.log("Current location:", { latitude, longitude });
          alert(
            `Location: ${latitude.toFixed(6)}, ${longitude.toFixed(
              6
            )}\nShare this with emergency services: ${mapsUrl}`
          );
        },
        (error) => {
          console.error("Location error:", error);
          alert(
            "Unable to access location. Please manually share your location with emergency services."
          );
        }
      );
    }
  };

  const activeAlerts = alerts
    .filter((alert) => !dismissedAlerts.has(alert.id))
    .sort((a, b) => {
      // Sort by severity (CRITICAL first) then by timestamp
      const severityOrder = { CRITICAL: 0, HIGH: 1, MODERATE: 2, LOW: 3 };
      const aSeverity =
        severityOrder[a.severity as keyof typeof severityOrder] ?? 4;
      const bSeverity =
        severityOrder[b.severity as keyof typeof severityOrder] ?? 4;

      if (aSeverity !== bSeverity) return aSeverity - bSeverity;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

  // Show only the most critical alert at a time
  const currentAlert = activeAlerts[0];

  if (!currentAlert) return null;

  return (
    <EmergencyAlertComponent
      alert={currentAlert}
      onDismiss={
        currentAlert.severity !== "CRITICAL"
          ? () => handleDismiss(currentAlert.id)
          : undefined
      }
      onCallEmergency={handleCallEmergency}
      onShareLocation={handleShareLocation}
    />
  );
}
