"use client"

import { useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"

interface VoiceCommand {
  phrases: string[]
  action: () => void
  description: string
}

interface UseVoiceCommandsOptions {
  enabled: boolean
  onCommandRecognized?: (command: string) => void
  onListening?: (listening: boolean) => void
}

export function useVoiceCommands({ enabled, onCommandRecognized, onListening }: UseVoiceCommandsOptions) {
  const router = useRouter()
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef(false)
  const commands = [
    {
      phrases: ["go home", "home page", "main menu"],
      action: () => {
        router.push("/")
        speak("Going to home page")
      },
      description: "Navigate to home page",
    },
    {
      phrases: ["skin analysis", "analyze skin", "take photo", "camera"],
      action: () => {
        router.push("/skin-analysis")
        speak("Opening skin analysis")
      },
      description: "Open skin analysis feature",
    },
    {
      phrases: ["voice logger", "record symptoms", "voice recording"],
      action: () => {
        router.push("/voice-logger")
        speak("Opening voice logger")
      },
      description: "Open voice symptom logger",
    },
    {
      phrases: ["medication", "scan medication", "pill scanner"],
      action: () => {
        router.push("/medication")
        speak("Opening medication scanner")
      },
      description: "Open medication scanner",
    },
    {
      phrases: ["health chat", "chat", "ask question", "talk to assistant"],
      action: () => {
        router.push("/chat")
        speak("Opening health chat")
      },
      description: "Open AI health chat",
    },
    {
      phrases: ["emergency", "help", "call for help", "urgent"],
      action: () => {
        speak("Emergency mode activated. Contacting emergency services.")
        // In a real app, this would trigger emergency protocols
        alert("Emergency services would be contacted in a real implementation")
      },
      description: "Activate emergency mode",
    },
    {
      phrases: ["go back", "previous page", "back"],
      action: () => {
        router.back()
        speak("Going back")
      },
      description: "Go to previous page",
    },
    {
      phrases: ["help", "what can you do", "voice commands", "commands"],
      action: () => {
        const commandList = commands
          .map((cmd) => `Say "${cmd.phrases[0]}" to ${cmd.description.toLowerCase()}`)
          .join(". ")
        speak(`Available voice commands: ${commandList}`)
      },
      description: "List available voice commands",
    },
  ]

  const speak = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 0.8
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }, [])

  const processCommand = useCallback(
    (transcript: string) => {
      const normalizedTranscript = transcript.toLowerCase().trim()
      console.log("🎤 Processing command:", normalizedTranscript);

      for (const command of commands) {
        for (const phrase of command.phrases) {
          if (normalizedTranscript.includes(phrase.toLowerCase())) {
            console.log("🎤 Command matched:", phrase, "->", command.description);
            onCommandRecognized?.(phrase)
            command.action()
            return true
          }
        }
      }

      // If no command matched, provide feedback
      console.log("🎤 No command matched for:", normalizedTranscript);
      speak("I didn't understand that command. Say 'help' to hear available commands.")
      return false
    },
    [onCommandRecognized, speak, commands],
  )

  const startListening = useCallback(async () => {
    console.log("Voice commands - startListening called, enabled:", enabled);
    if (!enabled) {
      console.log("Voice commands disabled");
      speak("Voice commands are disabled. Please enable voice navigation first.");
      return;
    }
    
    if (!("webkitSpeechRecognition" in window || "SpeechRecognition" in window)) {
      console.log("Speech recognition not supported");
      console.log("Available APIs:", Object.keys(window).filter(key => key.includes('Speech')));
      speak("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }
    
    console.log("Speech recognition is supported");

    // Check microphone permissions first
    try {
      console.log("🎤 Requesting microphone permission...");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log("🎤 Microphone permission granted");
      console.log("🎤 Available audio tracks:", stream.getAudioTracks().length);
      stream.getTracks().forEach(track => {
        console.log("🎤 Audio track:", track.label, track.enabled);
        track.stop(); // Stop the stream immediately
      });
    } catch (error) {
      console.error("❌ Microphone permission denied:", error);
      speak("Microphone permission is required for voice commands. Please allow microphone access in your browser settings and try again.");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()

    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = "en-US"
    recognitionRef.current.maxAlternatives = 1

    recognitionRef.current.onstart = () => {
      console.log("🎤 Voice recognition started - listening for commands");
      speak("Listening for voice commands. Say a command now. Available commands: go home, skin analysis, voice logger, medication, health chat, emergency, go back, or help.");
      isListeningRef.current = true
      onListening?.(true)
    }

    recognitionRef.current.onend = () => {
      console.log("🎤 Voice recognition ended");
      isListeningRef.current = false
      onListening?.(false)
    }

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      console.log("🎤 Voice command received:", transcript);
      console.log("🎤 Full event results:", event.results);
      speak(`I heard: ${transcript}`);
      processCommand(transcript)
    }

    recognitionRef.current.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error)
      console.error("Error details:", event)
      isListeningRef.current = false
      onListening?.(false)
      
      // Provide user feedback for common errors
      if (event.error === 'not-allowed') {
        speak("Microphone permission denied. Please allow microphone access and try again.")
      } else if (event.error === 'no-speech') {
        speak("No speech detected. Please try again and speak clearly.")
      } else if (event.error === 'network') {
        speak("Network error. Please check your internet connection.")
      } else if (event.error === 'aborted') {
        speak("Voice recognition was interrupted. Try again.")
      } else {
        speak(`Speech recognition error: ${event.error}. Please try again.`)
      }
    }

    console.log("Starting speech recognition...");
    try {
      recognitionRef.current.start()
    } catch (error) {
      console.error("Failed to start speech recognition:", error);
      speak("Failed to start voice recognition. Please try again.");
    }
    
    // Add a timeout to detect if recognition doesn't start
    setTimeout(() => {
      if (!isListeningRef.current) {
        console.log("⚠️ Voice recognition didn't start after 3 seconds");
        speak("Voice recognition failed to start. Please check microphone permissions and try again.");
      }
    }, 3000);
  }, [enabled, processCommand, onListening, speak])

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
  }, [])

  // Set up wake word detection
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      // Activate voice commands with Ctrl/Cmd + Space
      if ((event.ctrlKey || event.metaKey) && event.code === "Space") {
        event.preventDefault()
        if (!isListeningRef.current) {
          startListening()
          speak("Listening for voice command")
        } else {
          stopListening()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, startListening, stopListening, speak])

  return {
    startListening,
    stopListening,
    isListening: isListeningRef.current,
    commands: commands.map((cmd) => ({
      phrase: cmd.phrases[0],
      description: cmd.description,
    })),
  }
}
