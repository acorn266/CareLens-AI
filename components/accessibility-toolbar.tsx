"use client";

import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/components/accessibility-provider";
import {
  Volume2,
  VolumeX,
  Type,
  Contrast,
  Mic,
  MicOff,
  Settings,
  Phone,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Bell,
  BellOff,
} from "lucide-react";
import { useState } from "react";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function AccessibilityToolbar() {
  const {
    voiceEnabled,
    setVoiceEnabled,
    wakeWordEnabled,
    setWakeWordEnabled,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    speak,
    startVoiceCommand,
    isListeningForCommand,
    isListeningForWakeWord,
  } = useAccessibility();

  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const {
    isSupported: isNotificationSupported,
    permission: notificationPermission,
    isSubscribed: isNotificationSubscribed,
    requestPermission,
    subscribe: subscribeToNotifications,
    unsubscribe: unsubscribeFromNotifications,
    sendTestNotification,
  } = usePushNotifications();

  const toggleVoice = () => {
    const newState = !voiceEnabled;
    setVoiceEnabled(newState);
    if (newState) {
      speak(
        "Voice navigation enabled. Click the microphone button to start voice commands, or press Ctrl+Space."
      );
    } else {
      speak("Voice navigation disabled.");
    }
  };

  const toggleWakeWord = () => {
    const newState = !wakeWordEnabled;
    setWakeWordEnabled(newState);
    if (newState) {
      speak(
        "Wake word detection enabled. Say 'Hey MediVision' to activate voice commands."
      );
    } else {
      speak("Wake word detection disabled.");
    }
  };

  const increaseFontSize = () => {
    const newSize = Math.min(fontSize + 25, 300);
    setFontSize(newSize);
    speak(`Font size increased to ${newSize} percent`);
  };

  const decreaseFontSize = () => {
    const newSize = Math.max(fontSize - 25, 100);
    setFontSize(newSize);
    speak(`Font size decreased to ${newSize} percent`);
  };

  const toggleContrast = () => {
    const newState = !highContrast;
    setHighContrast(newState);
    speak(
      newState ? "High contrast mode enabled" : "High contrast mode disabled"
    );
  };

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle("dark");
    speak(isDarkMode ? "Light mode enabled" : "Dark mode enabled");
  };

  const toggleNotifications = async () => {
    if (!isNotificationSupported) {
      speak("Push notifications are not supported in this browser");
      return;
    }

    if (notificationPermission !== "granted") {
      const granted = await requestPermission();
      if (granted) {
        await subscribeToNotifications();
        speak("Push notifications enabled");
      } else {
        speak("Push notifications permission denied");
      }
    } else if (isNotificationSubscribed) {
      await unsubscribeFromNotifications();
      speak("Push notifications disabled");
    } else {
      await subscribeToNotifications();
      speak("Push notifications enabled");
    }
  };

  const activateEmergency = () => {
    speak(
      "Emergency mode activated. This would contact emergency services in a real implementation."
    );
    // In a real app, this would trigger emergency protocols
    alert("Emergency services would be contacted in a real implementation");
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
    speak(
      isExpanded
        ? "Accessibility toolbar collapsed"
        : "Accessibility toolbar expanded"
    );
  };

  return (
    <div className="fixed bottom-4 right-4 z-30 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg transition-all duration-200 ease-in-out">
      {/* Always visible toggle button */}
      <div className="p-2">
        <Button
          variant="outline"
          size="sm"
          onClick={toggleExpanded}
          className="touch-target flex items-center gap-2 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 border-gray-200 dark:border-gray-600"
          aria-label={
            isExpanded
              ? "Collapse accessibility toolbar"
              : "Expand accessibility toolbar"
          }
          title={
            isExpanded
              ? "Collapse accessibility toolbar"
              : "Expand accessibility toolbar"
          }
        >
          <Settings className="w-4 h-4" />
          {isExpanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Collapsible content */}
      {isExpanded && (
        <div className="p-2 pt-0 space-y-2 bg-white dark:bg-gray-800">
          {/* Voice Controls */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleVoice}
              className={`touch-target ${
                voiceEnabled ? "bg-primary text-primary-foreground" : ""
              }`}
              aria-label={
                voiceEnabled
                  ? "Disable voice navigation"
                  : "Enable voice navigation"
              }
              title={
                voiceEnabled
                  ? "Disable voice navigation"
                  : "Enable voice navigation"
              }
            >
              {voiceEnabled ? (
                <Volume2 className="w-4 h-4" />
              ) : (
                <VolumeX className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                console.log("🎤 Manual microphone button clicked, voiceEnabled:", voiceEnabled);
                if (!voiceEnabled) {
                  speak("Please enable voice navigation first by clicking the speaker button.");
                  return;
                }
                console.log("🎤 Starting voice command...");
                speak("Starting voice recognition now...");
                try {
                  await startVoiceCommand();
                } catch (error) {
                  console.error("🎤 Error starting voice command:", error);
                  speak("Error starting voice recognition. Please check microphone permissions.");
                }
              }}
              disabled={!voiceEnabled}
              className={`touch-target ${
                isListeningForCommand
                  ? "bg-red-500 text-white animate-pulse"
                  : voiceEnabled 
                    ? "bg-blue-500 text-white hover:bg-blue-600"
                    : "bg-gray-300 text-gray-500"
              }`}
              aria-label={isListeningForCommand ? "Stop voice command" : "Start voice command"}
              title={isListeningForCommand ? "Currently listening for voice commands" : "Click to start listening for voice commands"}
            >
              {isListeningForCommand ? (
                <MicOff className="w-4 h-4" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleWakeWord}
              disabled={!voiceEnabled}
              className={`touch-target ${
                wakeWordEnabled ? "bg-blue-500 text-white" : ""
              } ${isListeningForWakeWord ? "animate-pulse" : ""}`}
              aria-label={
                wakeWordEnabled ? "Disable wake word" : "Enable wake word"
              }
              title={
                wakeWordEnabled
                  ? "Disable wake word detection"
                  : "Enable wake word detection"
              }
            >
              <Settings className="w-4 h-4" />
            </Button>
          </div>

          {/* Visual Controls */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={decreaseFontSize}
              className="touch-target bg-transparent"
              aria-label="Decrease font size"
              title="Decrease font size"
            >
              <Type className="w-3 h-3" />
              <span className="text-xs">-</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={increaseFontSize}
              className="touch-target bg-transparent"
              aria-label="Increase font size"
              title="Increase font size"
            >
              <Type className="w-3 h-3" />
              <span className="text-xs">+</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleContrast}
              className={`touch-target ${
                highContrast ? "bg-primary text-primary-foreground" : ""
              }`}
              aria-label={
                highContrast ? "Disable high contrast" : "Enable high contrast"
              }
              title={
                highContrast ? "Disable high contrast" : "Enable high contrast"
              }
            >
              <Contrast className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={toggleDarkMode}
              className="touch-target bg-transparent"
              aria-label={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
              title={
                isDarkMode ? "Switch to light mode" : "Switch to dark mode"
              }
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
          </div>

          {/* Emergency & Notifications */}
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleNotifications}
              disabled={!isNotificationSupported}
              className={`touch-target ${
                isNotificationSubscribed && notificationPermission === "granted"
                  ? "bg-green-500 text-white"
                  : ""
              }`}
              aria-label={
                isNotificationSubscribed
                  ? "Disable notifications"
                  : "Enable notifications"
              }
              title={
                isNotificationSubscribed
                  ? "Disable push notifications"
                  : "Enable push notifications"
              }
            >
              {isNotificationSubscribed &&
              notificationPermission === "granted" ? (
                <Bell className="w-4 h-4" />
              ) : (
                <BellOff className="w-4 h-4" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={activateEmergency}
              className="touch-target bg-red-500 text-white hover:bg-red-600"
              aria-label="Emergency contact"
              title="Emergency contact"
            >
              <Phone className="w-4 h-4" />
            </Button>
          </div>

          {/* Instructions */}
          <div className="text-xs text-muted-foreground p-2 max-w-48 border-t">
            <p><strong>Voice Commands:</strong></p>
            <p>1. Click speaker to enable</p>
            <p>2. Click microphone to start</p>
            <p>3. Say: "go home", "skin analysis", "help", etc.</p>
            <p>Or press Ctrl+Space</p>
          </div>
        </div>
      )}
    </div>
  );
}
