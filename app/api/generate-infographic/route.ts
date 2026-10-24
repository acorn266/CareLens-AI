import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Google AI for Imagen
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || "");

export async function POST(request: NextRequest) {
  try {
    const { prompt, type, medicationData } = await request.json();

    if (!prompt) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    // Create enhanced prompt based on type
    let enhancedPrompt = "";
    let title = "";
    let content = [];

    switch (type) {
      case "medication_schedule":
        title = "Medication Schedule";
        content = [
          `Medication: ${medicationData?.name || "Medication"}`,
          `Dosage: ${medicationData?.dosage || "As prescribed"}`,
          `Frequency: ${medicationData?.frequency || "Daily"}`,
          "Take with food as directed",
          "Store in cool, dry place",
        ];
        enhancedPrompt = `Medication schedule for ${
          medicationData?.name || "medication"
        }`;
        break;

      case "health_progress":
        title = "Health Progress Tracking";
        content = [
          "Track your health journey",
          "Monitor improvements over time",
          "Set achievable goals",
          "Celebrate milestones",
          "Stay motivated and consistent",
        ];
        enhancedPrompt = "Health progress tracking infographic";
        break;

      case "symptom_tracker":
        title = "Symptom Tracker";
        content = [
          "Monitor symptoms and patterns",
          "Track severity and frequency",
          "Note triggers and relief methods",
          "Share with healthcare provider",
          "Maintain detailed records",
        ];
        enhancedPrompt = "Symptom tracking infographic";
        break;

      default:
        title = "Health Information";
        content = [
          "AI-generated health content",
          "Professional medical styling",
          "Accessible design",
          "Evidence-based information",
          "Consult healthcare professionals",
        ];
        enhancedPrompt = prompt;
    }

    // Try Imagen models using the correct API approach
    const imagenModels = [
      "imagen-4.0-generate-001",
      "imagen-3.0-generate-002",
      "imagen-3.0-generate-001",
    ];

    for (const modelName of imagenModels) {
      try {
        console.log(`Trying Imagen model: ${modelName}`);

        // Use the correct Imagen API endpoint
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:predict`,
          {
            method: "POST",
            headers: {
              "x-goog-api-key": process.env.GOOGLE_AI_API_KEY || "",
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              instances: [
                {
                  prompt: enhancedPrompt,
                },
              ],
              parameters: {
                sampleCount: 1,
                aspectRatio: "1:1",
                personGeneration: "allow_adult",
              },
            }),
          }
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        console.log(`Imagen API response received for ${modelName}`);

        // Extract image data from response
        if (
          result.predictions &&
          result.predictions[0] &&
          result.predictions[0].bytesBase64Encoded
        ) {
          const imageData = result.predictions[0].bytesBase64Encoded;
          console.log(`Successfully generated image with ${modelName}`);

          return NextResponse.json({
            success: true,
            imageData: imageData,
            mimeType: "image/png",
            prompt: enhancedPrompt,
            type: type,
            fallback: false, // Real Imagen generation
            modelUsed: modelName,
          });
        }
      } catch (imagenError) {
        console.log(`Imagen model ${modelName} failed:`, imagenError.message);
        continue; // Try next model
      }
    }

    console.log("All Imagen models failed, using enhanced fallback");

    // Enhanced Fallback: Create professional medical SVG infographic
    const svgContent = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#f8fafc;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#e2e8f0;stop-opacity:1" />
          </linearGradient>
          <linearGradient id="header" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style="stop-color:#1e40af;stop-opacity:1" />
            <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
          </linearGradient>
          <pattern id="medical" patternUnits="userSpaceOnUse" width="20" height="20">
            <circle cx="10" cy="10" r="1" fill="#dbeafe" opacity="0.3"/>
          </pattern>
        </defs>
        
        <!-- Background with medical pattern -->
        <rect width="800" height="600" fill="url(#bg)" />
        <rect width="800" height="600" fill="url(#medical)" />
        
        <!-- Header with gradient -->
        <rect x="0" y="0" width="800" height="100" fill="url(#header)" />
        
        <!-- Medical cross icon -->
        <g transform="translate(50, 25)">
          <rect x="0" y="20" width="50" height="10" fill="white" rx="5"/>
          <rect x="20" y="0" width="10" height="50" fill="white" rx="5"/>
        </g>
        
        <!-- Title -->
        <text x="400" y="65" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="32" font-weight="bold">
          ${title}
        </text>
        
        <!-- Content cards -->
        <g transform="translate(50, 130)">
          ${content
            .map(
              (item, index) => `
            <g transform="translate(0, ${index * 70})">
              <!-- Card background -->
              <rect x="0" y="0" width="700" height="60" fill="white" rx="10" stroke="#e5e7eb" stroke-width="1"/>
              <rect x="0" y="0" width="700" height="60" fill="url(#medical)" opacity="0.1" rx="10"/>
              
              <!-- Medical icon -->
              <circle cx="40" cy="30" r="15" fill="#3b82f6" opacity="0.1"/>
              <circle cx="40" cy="30" r="8" fill="#3b82f6"/>
              <text x="40" y="35" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="12" font-weight="bold">+</text>
              
              <!-- Content text -->
              <text x="70" y="35" fill="#374151" font-family="Arial, sans-serif" font-size="16" font-weight="500">
                ${item}
              </text>
            </g>
          `
            )
            .join("")}
        </g>
        
        <!-- Footer with medical styling -->
        <rect x="0" y="520" width="800" height="80" fill="#f1f5f9" stroke="#e5e7eb" stroke-width="1"/>
        <text x="400" y="545" text-anchor="middle" fill="#6b7280" font-family="Arial, sans-serif" font-size="14" font-weight="500">
          Generated by MediVision Assistant
        </text>
        <text x="400" y="570" text-anchor="middle" fill="#9ca3af" font-family="Arial, sans-serif" font-size="12">
          AI-Powered Health Companion • Professional Medical Styling
        </text>
        
        <!-- Decorative medical elements -->
        <g opacity="0.1">
          <circle cx="100" cy="100" r="40" fill="#3b82f6"/>
          <circle cx="700" cy="120" r="30" fill="#1e40af"/>
          <circle cx="150" cy="480" r="25" fill="#3b82f6"/>
          <rect x="650" y="450" width="30" height="30" fill="#1e40af" rx="5"/>
        </g>
      </svg>
    `;

    // Convert SVG to base64
    const base64 = Buffer.from(svgContent).toString("base64");

    return NextResponse.json({
      success: true,
      imageData: base64,
      mimeType: "image/svg+xml",
      prompt: enhancedPrompt,
      type: type,
      fallback: true, // Indicate this is a fallback implementation
      message: "Imagen 4 unavailable, using fallback SVG generation.",
    });
  } catch (error) {
    console.error("Infographic generation error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate infographic",
        details: error instanceof Error ? error.message : "Unknown error",
        fallback: true,
      },
      { status: 500 }
    );
  }
}

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
