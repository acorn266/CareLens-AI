"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Volume2, VolumeX, Eye, EyeOff, Type, Contrast } from "lucide-react"

interface AccessibilityControlsProps {
  onVoiceToggle: (enabled: boolean) => void
  onFontSizeChange: (size: number) => void
  onContrastToggle: (enabled: boolean) => void
}

export function AccessibilityControls({
  onVoiceToggle,
  onFontSizeChange,
  onContrastToggle,
}: AccessibilityControlsProps) {
  const [voiceEnabled, setVoiceEnabled] = useState(false)
  const [fontSize, setFontSize] = useState(100)
  const [highContrast, setHighContrast] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const [voiceSpeed, setVoiceSpeed] = useState(1)

  // Apply accessibility settings
  useEffect(() => {
    document.documentElement.style.fontSize = `${fontSize}%`
  }, [fontSize])

  useEffect(() => {
    if (highContrast) {
      document.documentElement.classList.add("high-contrast")
    } else {
      document.documentElement.classList.remove("high-contrast")
    }
  }, [highContrast])

  useEffect(() => {
    if (reducedMotion) {
      document.documentElement.classList.add("reduce-motion")
    } else {
      document.documentElement.classList.remove("reduce-motion")
    }
  }, [reducedMotion])

  const handleVoiceToggle = (enabled: boolean) => {
    setVoiceEnabled(enabled)
    onVoiceToggle(enabled)

    if (enabled) {
      speak("Voice navigation enabled. You can now use voice commands.")
    }
  }

  const speak = (text: string) => {
    if ("speechSynthesis" in window && voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = voiceSpeed
      utterance.pitch = 1
      speechSynthesis.speak(utterance)
    }
  }

  const handleFontSizeChange = (value: number[]) => {
    const newSize = value[0]
    setFontSize(newSize)
    onFontSizeChange(newSize)
    speak(`Font size set to ${newSize} percent`)
  }

  const handleContrastToggle = (enabled: boolean) => {
    setHighContrast(enabled)
    onContrastToggle(enabled)
    speak(enabled ? "High contrast mode enabled" : "High contrast mode disabled")
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-work-sans">
          <Eye className="w-5 h-5" />
          Accessibility Settings
        </CardTitle>
        <CardDescription>Customize the app for your needs</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Voice Navigation */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="font-medium">Voice Navigation</span>
            </div>
            <Switch checked={voiceEnabled} onCheckedChange={handleVoiceToggle} />
          </div>

          {voiceEnabled && (
            <div className="space-y-2 pl-6">
              <label className="text-sm text-muted-foreground">Voice Speed</label>
              <Slider
                value={[voiceSpeed]}
                onValueChange={(value) => setVoiceSpeed(value[0])}
                min={0.5}
                max={2}
                step={0.1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Slow</span>
                <span>Normal</span>
                <span>Fast</span>
              </div>
            </div>
          )}
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Type className="w-4 h-4" />
            <span className="font-medium">Font Size: {fontSize}%</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={handleFontSizeChange}
            min={75}
            max={200}
            step={25}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Small</span>
            <span>Normal</span>
            <span>Large</span>
            <span>Extra Large</span>
          </div>
        </div>

        {/* High Contrast */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Contrast className="w-4 h-4" />
            <span className="font-medium">High Contrast Mode</span>
          </div>
          <Switch checked={highContrast} onCheckedChange={handleContrastToggle} />
        </div>

        {/* Reduced Motion */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4" />
            <span className="font-medium">Reduce Motion</span>
          </div>
          <Switch
            checked={reducedMotion}
            onCheckedChange={(enabled) => {
              setReducedMotion(enabled)
              speak(enabled ? "Reduced motion enabled" : "Reduced motion disabled")
            }}
          />
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h4 className="font-medium font-work-sans">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => speak("This is a test of the voice system")}
              disabled={!voiceEnabled}
              className="touch-target"
            >
              <Volume2 className="w-4 h-4 mr-2" />
              Test Voice
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFontSize(100)
                setHighContrast(false)
                setReducedMotion(false)
                speak("Settings reset to default")
              }}
              className="touch-target"
            >
              Reset Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
