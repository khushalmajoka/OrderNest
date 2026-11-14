import { Check } from "lucide-react";

// "✓ Saved": the tick pops in. (With reduced motion switched on, it just appears.)
const SavedLabel = ({ children = "Saved" }) => (
  <span className="inline-flex items-center justify-center gap-1.5">
    <Check size={18} strokeWidth={3} className="animate-pop motion-reduce:animate-none" aria-hidden="true" />
    {children}
  </span>
);

export default SavedLabel;
