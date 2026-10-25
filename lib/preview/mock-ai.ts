// Canned AI responses for LOCAL DEVELOPMENT preview mode. These are fixed
// sample texts; no image, audio, video or message is sent to Gemini/Imagen.

const header =
  "**[Preview mode]** This is SAMPLE text, not a real AI analysis. Nothing you uploaded was analyzed or saved.";

export const MOCK_AI_TEXT = {
  skin: `${header}

1. **Visual Assessment**: Sample description of a small, slightly raised area of redness.
2. **Potential Concerns**: Sample concern: mild irritation that may be worth monitoring.
3. **Confidence Level**: Medium
4. **Recommendations**:
- Keep the area clean and dry
- Avoid scratching or new skin products
- Consult a healthcare professional if it spreads, bleeds or becomes painful
5. **Urgency Level**: Monitor

Important: This is not a medical diagnosis.`,

  medication: `${header}

1. **Medication Identification**: Example Medication 10 mg (fictional sample)
2. **Usage Information**: Sample usage: as directed on the label.
3. **Common Side Effects**: Sample side effects: drowsiness, mild nausea.
4. **Interactions**: Sample note: check with your pharmacist before combining medications.
5. **Storage Instructions**: Store in a cool, dry place.
6. **Safety Notes**: Sample safety note.
**Confidence Level**: Low
**Urgency Level**: Routine
**Recommendations**:
- Confirm medication details with your pharmacist`,

  voice: `${header}

1. **Transcript Review**: Sample summary of the spoken symptoms.
2. **Symptom Extraction**: Mild headache, tiredness (sample)
3. **Emotional Tone**: Calm
4. **Urgency Assessment**: Routine
5. **Follow-up Questions**:
- How long have you had these symptoms?
- Have they changed over time?
6. **Recommendations**:
- Rest and stay hydrated
- Seek care if symptoms are severe or getting worse
**Confidence Level**: Medium`,

  video: `${header}

1. **Visual Assessment**: Sample description of the video content.
2. **Movement Analysis**: Sample note: movement appears steady.
3. **Behavioral Indicators**: No sample signs of distress.
4. **Potential Concerns**: None noted in this sample.
5. **Confidence Level**: Low
6. **Recommendations**:
- Consult a healthcare professional about any concerns
7. **Urgency Level**: Routine`,

  chat: `${header}

In the full app, CareLens AI would answer your question here using Google Gemini. Configure GOOGLE_AI_API_KEY and run \`npm run dev\` (without preview mode) to get real responses.

Remember: CareLens AI provides general information only and is not a substitute for professional medical advice.`,
};

export const MOCK_TRANSCRIPT =
  "[Preview mode] Sample transcript. Your recording was not sent anywhere.";
