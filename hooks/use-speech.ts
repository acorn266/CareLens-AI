"use client";

import { useState, useCallback, useRef, useEffect } from "react";

interface UseSpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  lang?: string;
}

export function useSpeech(options: UseSpeechOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isSupported] = useState(
    () => typeof window !== "undefined" && "speechSynthesis" in window
  );
  const [hasError, setHasError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const currentTextRef = useRef<string>("");
  const currentCharIndexRef = useRef<number>(0);

  // Cleanup on unmount and page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      
      // Cleanup speech on unmount
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const speak = useCallback(
    (text: string) => {
      console.log("Speech hook called with text:", text);
      console.log("Speech supported:", isSupported);
      
      if (!isSupported || !text || !text.trim()) {
        console.log("Speech not supported or no text provided");
        return;
      }

      // If resuming from pause, continue from where we left off
      if (isPaused && currentTextRef.current === text) {
        console.log("Resuming speech from pause");
        speechSynthesis.resume();
        setIsPaused(false);
        return;
      }

      // Store current text and reset position
      currentTextRef.current = text;
      currentCharIndexRef.current = 0;

      // Cancel any ongoing speech
      speechSynthesis.cancel();

      // Wait for voices to be loaded
      const speakText = () => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = options.rate || 0.8;
        utterance.pitch = options.pitch || 1;
        utterance.volume = options.volume || 1;
        utterance.lang = options.lang || "en-US";

        utterance.onstart = () => {
          console.log("Speech started");
          setIsSpeaking(true);
          setIsPaused(false);
        };
        utterance.onend = () => {
          console.log("Speech ended");
          setIsSpeaking(false);
          setIsPaused(false);
          currentCharIndexRef.current = 0;
        };
        utterance.onerror = (event) => {
          // Don't treat "interrupted" as a real error - it's expected when user navigates
          if (event.error === 'interrupted') {
            console.log("Speech interrupted (expected during navigation)");
            setIsSpeaking(false);
            setIsPaused(false);
            setHasError(false); // Don't set error for interruption
            return;
          }
          
          console.error("Speech error:", event.error || "Unknown error");
          setIsSpeaking(false);
          setIsPaused(false);
          setHasError(true);
          
          // Try fallback approach only for synthesis-failed errors
          if (event.error === 'synthesis-failed') {
            console.log("Trying fallback speech synthesis...");
            setTimeout(() => {
              try {
                speechSynthesis.cancel();
                const fallbackUtterance = new SpeechSynthesisUtterance(text);
                fallbackUtterance.rate = 0.7;
                fallbackUtterance.pitch = 1;
                fallbackUtterance.volume = 1;
                fallbackUtterance.lang = "en-US";
                
                fallbackUtterance.onstart = () => {
                  setIsSpeaking(true);
                  setIsPaused(false);
                  setHasError(false);
                };
                fallbackUtterance.onend = () => {
                  setIsSpeaking(false);
                  setIsPaused(false);
                  currentCharIndexRef.current = 0;
                };
                fallbackUtterance.onerror = (fallbackEvent) => {
                  // Don't treat "interrupted" as a real error in fallback either
                  if (fallbackEvent.error === 'interrupted') {
                    console.log("Fallback speech interrupted (expected during navigation)");
                    setIsSpeaking(false);
                    setIsPaused(false);
                    setHasError(false);
                    return;
                  }
                  
                  console.error("Fallback speech also failed:", fallbackEvent.error || "Unknown error");
                  setIsSpeaking(false);
                  setIsPaused(false);
                  setHasError(true);
                };
                
                speechSynthesis.speak(fallbackUtterance);
              } catch (fallbackError) {
                console.error("Fallback speech error:", fallbackError);
                setIsSpeaking(false);
                setIsPaused(false);
                setHasError(true);
              }
            }, 100);
          }
        };

        utteranceRef.current = utterance;
        console.log("Starting speech synthesis...");
        speechSynthesis.speak(utterance);
      };

      // Check if voices are loaded, if not wait for them
      if (speechSynthesis.getVoices().length === 0) {
        console.log("Waiting for voices to load...");
        speechSynthesis.onvoiceschanged = () => {
          console.log("Voices loaded, starting speech...");
          speakText();
        };
      } else {
        speakText();
      }
    },
    [isSupported, options, isPaused]
  );

  const stop = useCallback(() => {
    if (isSupported) {
      try {
        speechSynthesis.cancel();
        setIsSpeaking(false);
        setIsPaused(false);
        setHasError(false);
        currentCharIndexRef.current = 0;
        console.log("Speech stopped");
      } catch (error) {
        console.error("Error stopping speech:", error);
        setIsSpeaking(false);
        setIsPaused(false);
      }
    }
  }, [isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      try {
        speechSynthesis.pause();
        setIsPaused(true);
        console.log("Speech paused");
      } catch (error) {
        console.error("Error pausing speech:", error);
      }
    }
  }, [isSupported, isSpeaking]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      try {
        speechSynthesis.resume();
        setIsPaused(false);
        console.log("Speech resumed");
      } catch (error) {
        console.error("Error resuming speech:", error);
      }
    }
  }, [isSupported, isPaused]);

  return {
    speak,
    stop,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    hasError,
  };
}
