"use client"

import type React from "react"

import { useState, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Camera, RotateCcw, Upload, Zap, ZapOff } from "lucide-react"

interface CameraCaptureProps {
  onCapture: (imageData: string) => void
  onAnalyze: (imageData: string) => void
  isAnalyzing?: boolean
}

export function CameraCapture({ onCapture, onAnalyze, isAnalyzing = false }: CameraCaptureProps) {
  const [isActive, setIsActive] = useState(false)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [hasFlash, setHasFlash] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "environment", // Use back camera by default
        },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        setIsActive(true)
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      alert("Unable to access camera. Please check permissions.")
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
      setIsActive(false)
    }
  }, [])

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return

    const canvas = canvasRef.current
    const video = videoRef.current
    const context = canvas.getContext("2d")

    if (!context) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    context.drawImage(video, 0, 0)

    const imageData = canvas.toDataURL("image/jpeg", 0.8)
    setCapturedImage(imageData)
    onCapture(imageData)
    stopCamera()
  }, [onCapture, stopCamera])

  const handleFileUpload = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
        onCapture(imageData)
      }
      reader.readAsDataURL(file)
    },
    [onCapture],
  )

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-work-sans">
          <Camera className="w-5 h-5" />
          Skin Analysis Camera
        </CardTitle>
        <CardDescription>Take a clear photo of the area you want to analyze</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camera viewfinder or captured image */}
        <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border-2 border-border">
          {capturedImage ? (
            <div className="relative w-full h-full">
              <img
                src={capturedImage || "/placeholder.svg"}
                alt="Captured for analysis"
                className="w-full h-full object-cover rounded-lg"
              />
              <div className="absolute top-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-sm font-medium">
                ✓ Image Ready
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${isActive ? "block" : "hidden"}`}
              />
              {!isActive && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <Camera className="w-16 h-16 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">Camera not active</p>
                  </div>
                </div>
              )}
              {/* Guidance overlay */}
              {isActive && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-4 border-2 border-white/50 rounded-lg">
                    <div className="absolute top-2 left-2 text-white text-sm bg-black/50 px-2 py-1 rounded">
                      Position area within frame
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Camera controls */}
        <div className="flex flex-wrap gap-2 justify-center">
          {!capturedImage ? (
            <>
              {!isActive ? (
                <Button onClick={startCamera} size="lg" className="touch-target">
                  <Camera className="w-4 h-4 mr-2" />
                  Start Camera
                </Button>
              ) : (
                <>
                  <Button onClick={capturePhoto} size="lg" className="touch-target bg-primary">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
                  </Button>
                  <Button onClick={stopCamera} variant="outline" size="lg" className="touch-target bg-transparent">
                    Stop Camera
                  </Button>
                  <Button onClick={() => setHasFlash(!hasFlash)} variant="outline" size="lg" className="touch-target">
                    {hasFlash ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                  </Button>
                </>
              )}

              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="lg"
                className="touch-target"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
            </>
          ) : (
            <>
              <Button
                onClick={() => onAnalyze(capturedImage)}
                size="lg"
                className="touch-target bg-primary"
                disabled={isAnalyzing}
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Analyze Photo
                  </>
                )}
              </Button>
              <Button onClick={retakePhoto} variant="outline" size="lg" className="touch-target bg-transparent">
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake
              </Button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          aria-label="Upload image file"
        />
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  )
}
