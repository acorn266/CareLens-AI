// Imagen integration utilities for health infographic generation

export interface ImagenRequest {
  prompt: string;
  type: 'medication_schedule' | 'health_progress' | 'symptom_tracker' | 'custom';
  medicationData?: {
    name?: string;
    dosage?: string;
    frequency?: string;
    instructions?: string;
  };
}

export interface ImagenResponse {
  success: boolean;
  imageData?: string;
  mimeType?: string;
  prompt?: string;
  type?: string;
  error?: string;
  fallback?: boolean;
}

// Generate health infographic using Imagen
export const generateHealthInfographic = async (
  request: ImagenRequest
): Promise<ImagenResponse> => {
  try {
    const response = await fetch('/api/generate-infographic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Imagen generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      fallback: true
    };
  }
};

// Create medication schedule infographic
export const generateMedicationSchedule = async (medicationData: {
  name: string;
  dosage: string;
  frequency: string;
  instructions?: string;
}) => {
  return generateHealthInfographic({
    prompt: `Medication schedule for ${medicationData.name}`,
    type: 'medication_schedule',
    medicationData
  });
};

// Create health progress infographic
export const generateHealthProgress = async (progressData: {
  title: string;
  milestones: string[];
  currentStatus: string;
}) => {
  return generateHealthInfographic({
    prompt: `Health progress tracking: ${progressData.title}`,
    type: 'health_progress'
  });
};

// Create symptom tracker infographic
export const generateSymptomTracker = async (symptoms: string[]) => {
  return generateHealthInfographic({
    prompt: `Symptom tracking for: ${symptoms.join(', ')}`,
    type: 'symptom_tracker'
  });
};

// Utility to convert base64 image data to blob URL
export const createImageBlobUrl = (base64Data: string, mimeType: string): string => {
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: mimeType });
  
  return URL.createObjectURL(blob);
};

// Download generated infographic
export const downloadInfographic = (imageData: string, mimeType: string, filename: string) => {
  const blobUrl = createImageBlobUrl(imageData, mimeType);
  
  const link = document.createElement('a');
  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  // Clean up the blob URL
  URL.revokeObjectURL(blobUrl);
};
