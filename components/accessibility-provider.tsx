"use client";

import type React from "react";

import { createContext, useContext, useState, useEffect } from "react";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";
import { useSpeech } from "@/hooks/use-speech";

interface AccessibilityContextType {
  // Voice settings
  voiceEnabled: boolean;
  setVoiceEnabled: (enabled: boolean) => void;
  voiceSpeed: number;
  setVoiceSpeed: (speed: number) => void;
  wakeWordEnabled: boolean;
  setWakeWordEnabled: (enabled: boolean) => void;

  // Visual settings
  fontSize: number;
  setFontSize: (size: number) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (enabled: boolean) => void;

  // Navigation settings
  keyboardNavEnabled: boolean;
  setKeyboardNavEnabled: (enabled: boolean) => void;

  // Functions
  speak: (text: string) => void;
  announceToScreenReader: (message: string) => void;
  startVoiceCommand: () => void;
  isListeningForCommand: boolean;
  isListeningForWakeWord: boolean;
}

const AccessibilityContext = createContext<
  AccessibilityContextType | undefined
>(undefined);

export function AccessibilityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Voice settings
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);

  // Visual settings
  const [fontSize, setFontSize] = useState(100);
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Navigation settings
  const [keyboardNavEnabled, setKeyboardNavEnabled] = useState(true);
  const [isListeningForCommand, setIsListeningForCommand] = useState(false);
  const [isListeningForWakeWord, setIsListeningForWakeWord] = useState(false);

  // Hooks
  const { speak } = useSpeech({ rate: voiceSpeed });
  const { announceToScreenReader } = useKeyboardNavigation({
    enabled: keyboardNavEnabled,
    onNavigate: (direction) => {
      announceToScreenReader(`Navigating ${direction}`);
    },
  });

  const { startListening } = useVoiceCommands({
    enabled: voiceEnabled,
    onCommandRecognized: (command) => {
      announceToScreenReader(`Voice command recognized: ${command}`);
    },
    onListening: setIsListeningForCommand,
  });

  // Alias startListening as startVoiceCommand for consistency
  const startVoiceCommand = startListening;

  // Apply settings to document
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`;
  }, [fontSize]);

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast");
    } else {
      document.documentElement.classList.remove("high-contrast");
    }
  }, [highContrast]);

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add("reduce-motion");
    } else {
      document.documentElement.classList.remove("reduce-motion");
    }
  }, [reducedMotion]);

  // Wake word detection
  useEffect(() => {
    if (!wakeWordEnabled || typeof window === "undefined") return;

    let recognition: any = null;

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition;
      recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListeningForWakeWord(true);
        console.log("Wake word detection started");
      };

      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
            .toLowerCase()
            .trim();

          if (
            transcript.includes("hey medivision") ||
            transcript.includes("hey medi vision")
          ) {
            speak("Yes, how can I help you?");
            setIsListeningForWakeWord(false);
            startVoiceCommand();
            break;
          }
        }
      };

      recognition.onerror = (event: any) => {
        console.error("Wake word recognition error:", event.error);
        setIsListeningForWakeWord(false);
      };

      recognition.onend = () => {
        setIsListeningForWakeWord(false);
        // Restart if wake word is still enabled
        if (wakeWordEnabled) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (error) {
              console.error("Failed to restart wake word detection:", error);
            }
          }, 1000);
        }
      };

      try {
        recognition.start();
      } catch (error) {
        console.error("Failed to start wake word detection:", error);
      }
    }

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [wakeWordEnabled, speak, startVoiceCommand]);

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("medivision-accessibility");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setVoiceEnabled(settings.voiceEnabled || false);
        setVoiceSpeed(settings.voiceSpeed || 1);
        setWakeWordEnabled(settings.wakeWordEnabled || false);
        setFontSize(settings.fontSize || 100);
        setHighContrast(settings.highContrast || false);
        setReducedMotion(settings.reducedMotion || false);
        setKeyboardNavEnabled(settings.keyboardNavEnabled !== false);
      } catch (error) {
        console.error("Failed to load accessibility settings:", error);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    const settings = {
      voiceEnabled,
      voiceSpeed,
      wakeWordEnabled,
      fontSize,
      highContrast,
      reducedMotion,
      keyboardNavEnabled,
    };
    localStorage.setItem("medivision-accessibility", JSON.stringify(settings));
  }, [
    voiceEnabled,
    voiceSpeed,
    wakeWordEnabled,
    fontSize,
    highContrast,
    reducedMotion,
    keyboardNavEnabled,
  ]);

  const value: AccessibilityContextType = {
    voiceEnabled,
    setVoiceEnabled,
    voiceSpeed,
    setVoiceSpeed,
    wakeWordEnabled,
    setWakeWordEnabled,
    fontSize,
    setFontSize,
    highContrast,
    setHighContrast,
    reducedMotion,
    setReducedMotion,
    keyboardNavEnabled,
    setKeyboardNavEnabled,
    speak,
    announceToScreenReader,
    startVoiceCommand: startListening,
    isListeningForCommand,
    isListeningForWakeWord,
  };

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error(
      "useAccessibility must be used within an AccessibilityProvider"
    );
  }
  return context;
}
