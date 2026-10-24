export interface EmergencyAlert {
  id: string;
  severity: "CRITICAL" | "HIGH" | "MODERATE" | "LOW";
  type: "MEDICAL" | "MENTAL_HEALTH" | "MEDICATION" | "VITAL_SIGNS";
  message: string;
  symptoms: string[];
  recommendations: string[];
  escalationLevel: number;
  timestamp: Date;
  confidence: number;
  emergencyContacts?: string[];
  locationRequired: boolean;
}

export interface HealthPattern {
  patternType:
    | "DECLINING_TREND"
    | "SUDDEN_CHANGE"
    | "RECURRING_ISSUE"
    | "MEDICATION_CONCERN";
  description: string;
  riskLevel: number;
  timeframe: string;
  dataPoints: any[];
}

class EmergencyIntelligenceSystem {
  private criticalKeywords = [
    // Cardiac emergencies
    "chest pain",
    "heart attack",
    "cardiac arrest",
    "heart stopping",
    // Respiratory emergencies
    "can't breathe",
    "difficulty breathing",
    "choking",
    "suffocating",
    // Neurological emergencies
    "stroke",
    "seizure",
    "unconscious",
    "paralysis",
    "sudden weakness",
    // Severe injuries
    "severe bleeding",
    "broken bone",
    "head injury",
    "severe burn",
    // Allergic reactions
    "allergic reaction",
    "anaphylaxis",
    "swelling face",
    "throat closing",
    // Mental health crises
    "suicide",
    "self-harm",
    "want to die",
    "ending it all",
    // Overdose/poisoning
    "overdose",
    "poisoned",
    "too many pills",
    "chemical exposure",
  ];

  private highPriorityKeywords = [
    "severe pain",
    "intense headache",
    "vision loss",
    "hearing loss",
    "fainting",
    "dizzy spells",
    "confusion",
    "memory loss",
    "high fever",
    "persistent vomiting",
    "severe diarrhea",
    "medication reaction",
    "side effects",
    "rash spreading",
  ];

  private vitalSignRanges = {
    heartRate: { min: 60, max: 100, critical: { min: 40, max: 140 } },
    bloodPressure: {
      systolic: { min: 90, max: 140, critical: { min: 70, max: 180 } },
      diastolic: { min: 60, max: 90, critical: { min: 40, max: 110 } },
    },
    temperature: { min: 97, max: 99, critical: { min: 95, max: 103 } },
    oxygenSaturation: { min: 95, max: 100, critical: { min: 85, max: 100 } },
  };

  // Real-time emergency detection from user input
  detectEmergency(input: string, context?: any): EmergencyAlert | null {
    const lowerInput = input.toLowerCase();

    // Check for critical emergencies
    for (const keyword of this.criticalKeywords) {
      if (lowerInput.includes(keyword)) {
        return this.createEmergencyAlert({
          severity: "CRITICAL",
          type: this.categorizeEmergency(keyword),
          message: `CRITICAL: Potential ${keyword} detected. Immediate medical attention required.`,
          symptoms: [keyword],
          recommendations: this.getCriticalRecommendations(keyword),
          escalationLevel: 1,
          confidence: 0.9,
          locationRequired: true,
        });
      }
    }

    // Check for high priority concerns
    for (const keyword of this.highPriorityKeywords) {
      if (lowerInput.includes(keyword)) {
        return this.createEmergencyAlert({
          severity: "HIGH",
          type: "MEDICAL",
          message: `High priority health concern detected: ${keyword}`,
          symptoms: [keyword],
          recommendations: this.getHighPriorityRecommendations(keyword),
          escalationLevel: 2,
          confidence: 0.7,
          locationRequired: false,
        });
      }
    }

    return null;
  }

  // Analyze health patterns from historical data
  analyzeHealthPatterns(healthRecords: any[]): HealthPattern[] {
    const patterns: HealthPattern[] = [];

    if (!healthRecords || healthRecords.length < 3) return patterns;

    // Analyze medication compliance
    const medicationPattern = this.analyzeMedicationPatterns(healthRecords);
    if (medicationPattern) patterns.push(medicationPattern);

    // Analyze symptom progression
    const symptomPattern = this.analyzeSymptomProgression(healthRecords);
    if (symptomPattern) patterns.push(symptomPattern);

    // Analyze vital signs trends
    const vitalPattern = this.analyzeVitalSignsTrends(healthRecords);
    if (vitalPattern) patterns.push(vitalPattern);

    return patterns;
  }

  // Monitor vital signs for emergency thresholds
  assessVitalSigns(vitals: any): EmergencyAlert | null {
    const { heartRate, bloodPressure, temperature, oxygenSaturation } = vitals;

    // Critical heart rate
    if (
      heartRate &&
      (heartRate < this.vitalSignRanges.heartRate.critical.min ||
        heartRate > this.vitalSignRanges.heartRate.critical.max)
    ) {
      return this.createEmergencyAlert({
        severity: "CRITICAL",
        type: "VITAL_SIGNS",
        message: `Critical heart rate detected: ${heartRate} BPM`,
        symptoms: ["abnormal heart rate"],
        recommendations: [
          "Seek immediate medical attention",
          "Call emergency services",
        ],
        escalationLevel: 1,
        confidence: 0.95,
        locationRequired: true,
      });
    }

    // Critical blood pressure
    if (bloodPressure) {
      const { systolic, diastolic } = bloodPressure;
      if (
        systolic > this.vitalSignRanges.bloodPressure.systolic.critical.max ||
        diastolic > this.vitalSignRanges.bloodPressure.diastolic.critical.max
      ) {
        return this.createEmergencyAlert({
          severity: "CRITICAL",
          type: "VITAL_SIGNS",
          message: `Critical blood pressure: ${systolic}/${diastolic}`,
          symptoms: ["hypertensive crisis"],
          recommendations: [
            "Immediate emergency care required",
            "Do not delay treatment",
          ],
          escalationLevel: 1,
          confidence: 0.9,
          locationRequired: true,
        });
      }
    }

    // Critical oxygen saturation
    if (
      oxygenSaturation &&
      oxygenSaturation < this.vitalSignRanges.oxygenSaturation.critical.min
    ) {
      return this.createEmergencyAlert({
        severity: "CRITICAL",
        type: "VITAL_SIGNS",
        message: `Critical oxygen saturation: ${oxygenSaturation}%`,
        symptoms: ["low oxygen levels"],
        recommendations: [
          "Emergency medical attention required",
          "Call 911 immediately",
        ],
        escalationLevel: 1,
        confidence: 0.95,
        locationRequired: true,
      });
    }

    return null;
  }

  private createEmergencyAlert(
    params: Partial<EmergencyAlert>
  ): EmergencyAlert {
    return {
      id: `emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      severity: params.severity || "MODERATE",
      type: params.type || "MEDICAL",
      message: params.message || "Health concern detected",
      symptoms: params.symptoms || [],
      recommendations: params.recommendations || [],
      escalationLevel: params.escalationLevel || 3,
      timestamp: new Date(),
      confidence: params.confidence || 0.5,
      emergencyContacts: params.emergencyContacts || [],
      locationRequired: params.locationRequired || false,
    };
  }

  private categorizeEmergency(keyword: string): EmergencyAlert["type"] {
    if (
      keyword.includes("suicide") ||
      keyword.includes("self-harm") ||
      keyword.includes("want to die")
    )
      return "MENTAL_HEALTH";
    if (
      keyword.includes("medication") ||
      keyword.includes("pills") ||
      keyword.includes("overdose")
    )
      return "MEDICATION";
    return "MEDICAL";
  }

  private getCriticalRecommendations(keyword: string): string[] {
    const baseRecommendations = [
      "Call emergency services (911) immediately",
      "Stay calm and do not panic",
      "Follow emergency dispatcher instructions",
    ];

    if (keyword.includes("chest pain") || keyword.includes("heart attack")) {
      return [
        ...baseRecommendations,
        "Sit down and rest",
        "Chew aspirin if not allergic",
        "Loosen tight clothing",
      ];
    }

    if (keyword.includes("breathing") || keyword.includes("choking")) {
      return [
        ...baseRecommendations,
        "Sit upright or lean forward",
        "Use rescue inhaler if available",
        "Clear airway if possible",
      ];
    }

    if (keyword.includes("suicide") || keyword.includes("self-harm")) {
      return [
        "Call National Suicide Prevention Lifeline: 988",
        "Stay with someone you trust",
        "Remove harmful objects from reach",
        "Seek immediate professional help",
      ];
    }

    return baseRecommendations;
  }

  private getHighPriorityRecommendations(keyword: string): string[] {
    return [
      "Contact healthcare provider within 24 hours",
      "Monitor symptoms closely",
      "Document any changes",
      "Consider urgent care if symptoms worsen",
    ];
  }

  private analyzeMedicationPatterns(records: any[]): HealthPattern | null {
    const medicationRecords = records.filter(
      (r) =>
        r.type === "medication" ||
        r.content?.toLowerCase().includes("medication") ||
        r.content?.toLowerCase().includes("pills")
    );

    if (medicationRecords.length < 2) return null;

    const missedDoses = medicationRecords.filter(
      (r) =>
        r.content?.toLowerCase().includes("missed") ||
        r.content?.toLowerCase().includes("forgot")
    ).length;

    if (missedDoses > medicationRecords.length * 0.3) {
      return {
        patternType: "MEDICATION_CONCERN",
        description: "Frequent missed medication doses detected",
        riskLevel: 0.7,
        timeframe: "Past 30 days",
        dataPoints: medicationRecords,
      };
    }

    return null;
  }

  private analyzeSymptomProgression(records: any[]): HealthPattern | null {
    const symptomRecords = records.filter(
      (r) =>
        r.analysis?.symptoms ||
        r.content?.includes("pain") ||
        r.content?.includes("feel")
    );

    if (symptomRecords.length < 3) return null;

    // Check for worsening trends
    const recentSymptoms = symptomRecords.slice(-5);
    const worseningCount = recentSymptoms.filter(
      (r) =>
        r.content?.includes("worse") ||
        r.content?.includes("getting bad") ||
        r.analysis?.urgencyLevel === "High"
    ).length;

    if (worseningCount >= 2) {
      return {
        patternType: "DECLINING_TREND",
        description: "Symptoms appear to be worsening over time",
        riskLevel: 0.6,
        timeframe: "Past 14 days",
        dataPoints: recentSymptoms,
      };
    }

    return null;
  }

  private analyzeVitalSignsTrends(records: any[]): HealthPattern | null {
    const vitalRecords = records.filter((r) => r.vitals || r.analysis?.vitals);

    if (vitalRecords.length < 3) return null;

    // Simple trend analysis - check if last 3 readings show concerning pattern
    const recentVitals = vitalRecords.slice(-3);
    const concerningTrend = recentVitals.every((r) => {
      const vitals = r.vitals || r.analysis?.vitals;
      return vitals?.heartRate > 100 || vitals?.bloodPressure?.systolic > 140;
    });

    if (concerningTrend) {
      return {
        patternType: "SUDDEN_CHANGE",
        description: "Concerning vital signs trend detected",
        riskLevel: 0.8,
        timeframe: "Past week",
        dataPoints: recentVitals,
      };
    }

    return null;
  }
}

// Export singleton instance
export const emergencyIntelligence = new EmergencyIntelligenceSystem();

// Utility functions for emergency protocols
export function getEmergencyContacts(): string[] {
  return [
    "911 (Emergency Services)",
    "988 (Suicide & Crisis Lifeline)",
    "Poison Control: 1-800-222-1222",
    "Healthcare Provider",
  ];
}

export function formatEmergencyAlert(alert: EmergencyAlert): string {
  return `
🚨 ${alert.severity} ALERT 🚨
${alert.message}

Confidence: ${Math.round(alert.confidence * 100)}%
Time: ${alert.timestamp.toLocaleString()}

Symptoms Detected:
${alert.symptoms.map((s) => `• ${s}`).join("\n")}

Recommended Actions:
${alert.recommendations.map((r) => `• ${r}`).join("\n")}

${
  alert.locationRequired
    ? "\n⚠️ LOCATION SHARING RECOMMENDED FOR EMERGENCY SERVICES"
    : ""
}
  `.trim();
}
