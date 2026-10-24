"use client";

import type React from "react";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { useSpeech } from "@/hooks/use-speech";
import { EmergencyAlertDisplay } from "@/components/emergency-alert-display";
import { formatAnalysisText } from "@/lib/text-formatter";
import { getConversations } from "@/lib/health-records";
import {
  ArrowLeft,
  Send,
  Volume2,
  VolumeX,
  Bot,
  User,
  Plus,
  MessageSquare,
  Clock,
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface Conversation {
  id: string;
  title: string;
  messages: any[];
  created_at: string;
  updated_at: string;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { speak, isSpeaking, stop } = useSpeech();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your AI health assistant. I'm here to help answer your health questions and provide general guidance. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [emergencyAlert, setEmergencyAlert] = useState<any>(null);
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const contextProcessedRef = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    // Always scroll to bottom when messages change to keep input visible
    scrollToBottom();
  }, [messages]);

  // Set initial welcome message immediately on mount
  useEffect(() => {
    if (messages.length === 0 && typeof window !== "undefined") {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content:
            "Hello! I'm your AI health assistant. I'm here to help answer your health questions and provide general guidance. How can I assist you today?",
          timestamp: new Date(),
        },
      ]);
      setIsInitialized(true);
    }
  }, []);

  // Handle URL parameters for context from analysis pages
  useEffect(() => {
    const context = searchParams.get("context");
    const analysisType = searchParams.get("type");
    const analysisData = searchParams.get("data");

    if (
      context &&
      analysisType &&
      analysisData &&
      !contextProcessedRef.current
    ) {
      contextProcessedRef.current = true; // Prevent duplicate processing
      try {
        const decodedData = decodeURIComponent(analysisData);
        const parsedData = JSON.parse(decodedData);

        // Create context-aware initial messages
        const contextMessages: Message[] = [
          {
            id: "context-welcome",
            role: "assistant",
            content: `Hello! I'm your AI health assistant. I can see you've just completed a ${analysisType} analysis. I'm here to help you discuss the results and answer any questions you might have about your health.`,
            timestamp: new Date(),
          },
          {
            id: "context-analysis-user",
            role: "user",
            content: `I just completed a ${analysisType} analysis. Here are the results:\n\n${
              parsedData.analysis ||
              parsedData.summary ||
              "Analysis completed successfully."
            }\n\nCan you help me understand these results and answer any questions I might have?`,
            timestamp: new Date(),
          },
        ];

        // Completely reset state for new context-based chat
        setMessages(contextMessages);
        setCurrentConversationId(null); // Start new conversation with context
        setIsLoadingConversations(false); // Ensure loading state is false

        // Automatically send the analysis message to get AI response
        const sendAnalysisMessage = async () => {
          try {
            setIsLoading(true); // Show loading state
            const userMessage = contextMessages[1]; // The analysis message
            const response = await apiClient.sendChatMessage(
              userMessage.content,
              [], // Empty conversation history for new chat
              null // No existing conversation ID
            );

            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content: formatAnalysisText(response.message),
              timestamp: new Date(),
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Update conversation ID if this created a new conversation
            if (response.conversationId) {
              setCurrentConversationId(response.conversationId);
            }
          } catch (error) {
            console.error("Error sending analysis message:", error);
            // Add error message if sending fails
            const errorMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: "assistant",
              content:
                "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, errorMessage]);
          } finally {
            setIsLoading(false); // Hide loading state
          }
        };

        // Send the analysis message after a short delay to ensure UI is ready
        setTimeout(sendAnalysisMessage, 1000);

        // Don't load conversations for sidebar when coming from analysis pages
        // This prevents layout shifts and empty scroll areas

        // Clear URL parameters after processing
        const newUrl = new URL(window.location.href);
        newUrl.searchParams.delete("context");
        newUrl.searchParams.delete("type");
        newUrl.searchParams.delete("data");
        window.history.replaceState({}, "", newUrl.toString());
      } catch (error) {
        console.error("Error parsing context data:", error);
        // Fall back to normal conversation loading
      }
    }
  }, [searchParams]);

  // Load conversations on page load (only if no context parameters and after initialization)
  useEffect(() => {
    const context = searchParams.get("context");
    if (context) {
      // If we have context, don't load existing conversations at all
      setIsLoadingConversations(false);
      return;
    }

    // Also check if we already have context messages (prevent double loading)
    if (messages.length > 0 && messages[0].id === "context-welcome") {
      setIsLoadingConversations(false);
      return;
    }

    // Only load conversations after initialization to prevent layout shifts
    if (!isInitialized) {
      return;
    }

    // Don't load conversations if we're in a new chat (currentConversationId is null)
    // This prevents the empty scroll area issue when user sends first message
    if (currentConversationId === null) {
      return;
    }

    const loadConversations = async () => {
      try {
        console.log("Loading conversations for sidebar...");
        const conversationsData = await getConversations();
        console.log("Loaded conversations:", conversationsData);
        setConversations(conversationsData);
      } catch (error) {
        console.error("Error loading conversations:", error);
      }
    };

    loadConversations();
  }, [searchParams, isInitialized, currentConversationId]);

  // Function to start a new chat
  const startNewChat = () => {
    setCurrentConversationId(null);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content:
          "Hello! I'm your AI health assistant. I'm here to help answer your health questions and provide general guidance. How can I assist you today?",
        timestamp: new Date(),
      },
    ]);
    setSidebarOpen(false);
    contextProcessedRef.current = false; // Reset context processing flag
  };

  // Function to manually load conversations (only when user explicitly wants to see history)
  const loadConversationsManually = async () => {
    try {
      console.log("Manually loading conversations...");
      const conversationsData = await getConversations();
      setConversations(conversationsData);
    } catch (error) {
      console.error("Error loading conversations:", error);
    }
  };

  // Function to switch to a different conversation
  const switchToConversation = (conversation: Conversation) => {
    setCurrentConversationId(conversation.id);

    // Convert conversation messages to Message format
    const conversationMessages: Message[] = conversation.messages.map(
      (msg: any, index: number) => ({
        id: `${conversation.id}-${index}`,
        role: msg.role,
        content:
          msg.role === "assistant"
            ? formatAnalysisText(msg.content)
            : msg.content,
        timestamp: new Date(msg.timestamp),
      })
    );

    setMessages(conversationMessages);
    setSidebarOpen(false);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Convert messages to conversation history format
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString(),
      }));

      const response = await apiClient.sendChatMessage(
        inputMessage,
        conversationHistory,
        currentConversationId
      );

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: formatAnalysisText(response.message),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Update conversation ID if this is a new conversation
      if (response.conversationId && !currentConversationId) {
        setCurrentConversationId(response.conversationId);
        // Don't refresh conversations list automatically to prevent layout shifts
        // Conversations will be loaded when user opens sidebar
      }

      // Check for emergency detection
      if (response.emergency) {
        setEmergencyAlert(response.emergency);
        // Speak emergency alert immediately
        speak(`Emergency detected: ${response.emergency.message}`);
      } else {
        // Speak the response if voice is enabled
        if (voiceEnabled && response.message && response.message.trim()) {
          speak(formatAnalysisText(response.message));
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "I'm sorry, I'm having trouble responding right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      stop();
    }
    setVoiceEnabled(!voiceEnabled);
  };

  const speakMessage = (content: string) => {
    if (isSpeaking) {
      stop();
    } else {
      speak(content);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <div
        className={`${
          sidebarOpen ? "w-80" : "w-0"
        } transition-all duration-300 overflow-hidden bg-card border-r border-border flex flex-col`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Conversations</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen(false)}
              className="touch-target"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
          <Button
            onClick={startNewChat}
            className="w-full touch-target"
            size="sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Chat
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {isLoadingConversations ? (
            <div className="text-center text-muted-foreground py-4">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center text-muted-foreground py-4">
              <div className="text-sm">No conversations yet</div>
              <div className="text-xs mt-2 opacity-70">
                Start a new chat to see it here
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <Card
                  key={conversation.id}
                  className={`cursor-pointer transition-colors ${
                    currentConversationId === conversation.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => switchToConversation(conversation)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <MessageSquare className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.title}
                        </p>
                        <div className="flex items-center gap-1 text-xs opacity-70 mt-1">
                          <Clock className="w-3 h-3" />
                          {new Date(
                            conversation.updated_at
                          ).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <header className="border-b border-border bg-card">
          <div className="px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    if (!sidebarOpen) {
                      // Load conversations when opening sidebar
                      loadConversationsManually();
                    }
                    setSidebarOpen(!sidebarOpen);
                  }}
                  className="touch-target"
                  aria-label="Toggle sidebar"
                >
                  <MessageSquare className="w-4 h-4" />
                </Button>
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
                    Health Chat
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    AI-powered health assistant
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={startNewChat}
                  variant="outline"
                  size="sm"
                  className="touch-target"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  New Chat
                </Button>
                <Button
                  variant={voiceEnabled ? "default" : "outline"}
                  size="sm"
                  onClick={toggleVoice}
                  className="touch-target"
                  aria-label={
                    voiceEnabled
                      ? "Disable voice responses"
                      : "Enable voice responses"
                  }
                >
                  {voiceEnabled ? (
                    <Volume2 className="w-4 h-4" />
                  ) : (
                    <VolumeX className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Chat Messages */}
        <div className="flex-1 container mx-auto px-4 py-2 max-w-4xl min-h-0">
          <div className="space-y-4 mb-2">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                <Card
                  className={`max-w-[80%] ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="prose prose-sm prose-gray max-w-none flex-1">
                        <p className="text-sm leading-relaxed whitespace-pre-wrap m-0">
                          {message.content}
                        </p>
                      </div>
                      {message.role === "assistant" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => speakMessage(message.content)}
                          className="touch-target flex-shrink-0 h-8 w-8 p-0"
                          aria-label="Listen to message"
                        >
                          <Volume2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    <p className="text-xs opacity-70 mt-2">
                      {new Date(message.timestamp).toLocaleTimeString("en-US", {
                        hour12: false,
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </CardContent>
                </Card>

                {message.role === "user" && (
                  <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
                <Card className="max-w-[80%]">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        />
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        />
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Thinking...
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border bg-card flex-shrink-0">
          <div className="container mx-auto px-4 py-2 max-w-4xl">
            <div className="flex gap-2">
              <Input
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask me about your health concerns..."
                className="flex-1 touch-target"
                onKeyPress={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="touch-target"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Quick Suggestions */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                "What are common cold symptoms?",
                "How can I improve my sleep?",
                "When should I see a doctor?",
                "Tell me about healthy eating",
              ].map((suggestion) => (
                <Button
                  key={suggestion}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setInputMessage(suggestion);
                    handleSendMessage();
                  }}
                  className="touch-target text-xs"
                  disabled={isLoading}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Emergency Alert Display */}
      {emergencyAlert && (
        <EmergencyAlertDisplay
          emergency={emergencyAlert}
          onDismiss={() => setEmergencyAlert(null)}
          onEmergencyCall={() => {
            // Handle emergency call
            window.open("tel:911", "_self");
          }}
        />
      )}
    </div>
  );
}
