// LOCAL DEVELOPMENT ONLY preview mode.
//
// Lets the UI run without Supabase or Gemini credentials by swapping in an
// in-memory mock database and canned AI responses. It is off by default and
// only turns on when BOTH are true:
//   1. NODE_ENV is "development" (i.e. `next dev`; never `next build`/`next start`)
//   2. NEXT_PUBLIC_CARELENS_PREVIEW is explicitly set to "true"
//
// Start it with `npm run dev:preview`.
export const isPreviewMode =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_CARELENS_PREVIEW === "true";

export const PREVIEW_NOTICE =
  "[Preview mode] Sample data only. No real AI analysis was performed and nothing was saved.";
