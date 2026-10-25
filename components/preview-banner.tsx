import { isPreviewMode } from "@/lib/preview-mode";

// Shown on every page while LOCAL DEVELOPMENT preview mode is on. Fixed and
// click-through so it never shifts or blocks the page layout underneath.
export function PreviewBanner() {
  if (!isPreviewMode) return null;

  return (
    <div
      role="status"
      className="pointer-events-none fixed bottom-3 left-1/2 z-[60] max-w-[90vw] -translate-x-1/2 rounded-full bg-amber-400 px-4 py-1.5 text-center text-xs font-semibold text-black shadow-lg"
    >
      Preview mode (local dev only): sample data, mock user, simulated AI.
      Nothing is saved or sent.
    </div>
  );
}
