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

// A warning sign to look for. `label` names the alert; `pattern` matches the
// many ways people describe it. Patterns are matched against lowercased text.
interface WarningSign {
  label: string;
  pattern: RegExp;
}

const sign = (label: string, ...alternatives: string[]): WarningSign => ({
  label,
  pattern: new RegExp(`\\b(?:${(alternatives.length ? alternatives : [label]).join("|")})\\b`),
});

// Words that negate a symptom when they appear shortly before it in the same
// clause ("I do not have chest pain", "no chest pain", "without any bleeding").
const NEGATION_CUE =
  /\b(?:no|not|don't|do not|doesn't|does not|didn't|did not|never|without|denies|deny|isn't|is not|aren't|wasn't|haven't|hasn't|free of|none)\b(?:\s+\S+){0,4}\s*$/;
// Hedges that contain "not" but are not denials ("not sure", "not certain")
const HEDGE = /\bnot (?:sure|certain|positive)\b/g;

// Phrases that mark a request for general information rather than a report
const INFORMATIONAL_CUE =
  /\b(?:what (?:is|are|causes)|how (?:do|does|can|is|are)|why (?:do|does|is|are)|(?:can|does|is) (?:a|an)|signs of|symptoms of|warning signs|risk of|risks of|causes of|prevent|tell me about|information about|learn about|difference between)\b/;
// First-person reports of experiencing something, which override the above
const PERSONAL_REPORT =
  /\b(?:i|i'm|i am|i've|i have|me|my|we|we're)\b[^.?!]*\b(?:have|having|had|has|feel|feeling|felt|got|experiencing|suffering|is|are|was|can't|cannot|can not|think|suddenly)\b/;

class EmergencyIntelligenceSystem {
  private criticalSigns: WarningSign[] = [
    // Cardiac emergencies
    sign("chest pain", "chest pains?", "pain in (?:my |the )?chest", "chest (?:is )?(?:tight|tightness|pressure)"),
    sign("heart attack", "heart attack", "having a heart attack"),
    sign("cardiac arrest"),
    sign("heart stopping"),
    // Respiratory emergencies
    sign(
      "difficulty breathing",
      "difficulty breathing",
      "trouble breathing",
      "struggling to breathe",
      "(?:can't|cannot|can not|cant|unable to|not able to) breathe",
      "can't catch my breath"
    ),
    sign("choking"),
    sign("suffocating"),
    // Neurological emergencies (including FAST stroke signs)
    sign("stroke", "(?:a |having a )?stroke"),
    sign(
      "stroke symptoms",
      "face (?:is )?drooping",
      "drooping face",
      "facial droop",
      "(?:one|1) side of (?:my |the |his |her |their )?face",
      "slurred speech",
      "slurring (?:my )?words",
      "(?:can't|cannot|can not|unable to|not able to) speak",
      "trouble speaking",
      "difficulty speaking",
      "(?:numb|weak|weakness)(?:ness)? (?:on|in) (?:one|1) side"
    ),
    sign("seizure", "seizures?", "convulsions?"),
    sign("unconscious", "unconscious", "passed out and (?:won't|will not) wake"),
    sign("paralysis", "paralysis", "paralyzed", "can't move (?:my )?(?:arm|leg|side)"),
    sign("sudden weakness"),
    // Severe injuries
    sign("severe bleeding", "severe bleeding", "bleeding (?:heavily|badly|a lot|won't stop|will not stop)"),
    sign("broken bone", "broken bones?", "bone is broken"),
    sign("head injury", "head injury", "hit my head", "hit (?:his|her|their) head"),
    sign("severe burn", "severe burns?"),
    // Allergic reactions
    sign("allergic reaction"),
    sign("anaphylaxis", "anaphylaxis", "anaphylactic"),
    sign("swelling face", "swelling face", "face (?:is )?swelling", "swollen (?:face|tongue|throat|lips)"),
    sign("throat closing", "throat (?:is )?closing"),
    // Mental health crises
    sign("suicide", "suicide", "suicidal", "kill myself"),
    sign("self-harm", "self-harm", "self harm", "hurt myself", "hurting myself"),
    sign("want to die"),
    sign("ending it all"),
    // Overdose/poisoning
    sign("overdose", "overdosed?", "overdosing"),
    sign("poisoned"),
    sign("too many pills"),
    sign("chemical exposure"),
  ];

  private highPrioritySigns: WarningSign[] = [
    sign("severe pain"),
    sign("intense headache", "intense headache", "severe headache", "worst headache"),
    sign("vision loss", "vision loss", "lost (?:my )?vision", "can't see"),
    sign("hearing loss"),
    sign("fainting", "fainting", "fainted", "passed out"),
    sign("dizzy spells"),
    sign("confusion", "confusion", "confused"),
    sign("memory loss"),
    sign("high fever"),
    sign("persistent vomiting", "persistent vomiting", "can't stop vomiting"),
    sign("severe diarrhea"),
    sign("medication reaction"),
    sign("side effects"),
    sign("rash spreading"),
  ];

  // Crisis resources should still be offered when someone asks about these,
  // so they are not suppressed by the informational-question rule.
  private alwaysShowCategories: EmergencyAlert["type"][] = ["MENTAL_HEALTH"];

  // Returns the first warning sign in `signs` that the user is actually
  // reporting, skipping negated mentions and general-information questions.
  private findReportedSign(text: string, signs: WarningSign[]): WarningSign | null {
    const normalized = text.toLowerCase().replace(/[‘’]/g, "'");
    // Judge each sentence on its own, then each clause within it
    const sentences = normalized.split(/(?<=[.?!])\s+|\n+/).filter(Boolean);

    for (const s of signs) {
      for (const sentence of sentences) {
        const informational =
          INFORMATIONAL_CUE.test(sentence) && !PERSONAL_REPORT.test(sentence);
        if (
          informational &&
          !this.alwaysShowCategories.includes(this.categorizeEmergency(s.label))
        ) {
          continue;
        }

        const clauses = sentence.split(/,|;|\bbut\b|\bhowever\b|\bthough\b/);
        for (const clause of clauses) {
          const match = s.pattern.exec(clause);
          if (!match) continue;
          const before = clause.slice(0, match.index).replace(HEDGE, "");
          if (NEGATION_CUE.test(before)) continue;
          return s;
        }
      }
    }
    return null;
  }

  private vitalSignRanges = {
    heartRate: { min: 60, max: 100, critical: { min: 40, max: 140 } },
    bloodPressure: {
      systolic: { min: 90, max: 140, critical: { min: 70, max: 180 } },
      diastolic: { min: 60, max: 90, critical: { min: 40, max: 110 } },
    },
    temperature: { min: 97, max: 99, critical: { min: 95, max: 103 } },
    oxygenSaturation: { min: 95, max: 100, critical: { min: 85, max: 100 } },
  };

  // Real-time emergency detection from the USER's own input (a typed message or
  // their spoken transcript). Do not pass AI-generated text: model replies often
  // list warning signs as safety advice, which would raise false alarms.
  detectEmergency(input: string, context?: any): EmergencyAlert | null {
    // Check for critical emergencies
    const critical = this.findReportedSign(input, this.criticalSigns);
    if (critical) {
      const keyword = critical.label;
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

    // Check for high priority concerns
    const high = this.findReportedSign(input, this.highPrioritySigns);
    if (high) {
      const keyword = high.label;
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
      keyword.includes("want to die") ||
      keyword.includes("ending it all")
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

    if (this.categorizeEmergency(keyword) === "MENTAL_HEALTH") {
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
