import { ClipboardCheck } from "lucide-react";

// A calm line above the orders: "6 orders look delivered but are still open".
// Not a pop-up, so nobody is interrupted. Shown only to people who may change
// orders, and only when something needs a look.
const NeedsReviewBanner = ({ review, onOpen }) => {
  if (!review || !review.enabled) return null;
  const { probablyDelivered = 0, late = 0 } = review;
  if (probablyDelivered + late === 0) return null;

  const orders = (n) => `${n} ${n === 1 ? "order" : "orders"}`;
  const parts = [];
  if (probablyDelivered) {
    parts.push(`${orders(probablyDelivered)} ${probablyDelivered === 1 ? "looks" : "look"} delivered but ${probablyDelivered === 1 ? "is" : "are"} still open`);
  }
  if (late) parts.push(`${orders(late)} ${late === 1 ? "is" : "are"} late and may need a check`);
  const text = parts.join(". ") + ".";

  return (
    <div
      role="region"
      aria-label="Orders that need a check"
      className="mb-5 flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 sm:p-4"
    >
      <span className="inline-flex shrink-0 p-1.5 rounded-md text-amber-700 bg-amber-100 self-start">
        <ClipboardCheck size={18} />
      </span>
      <p className="text-sm text-gray-800 flex-1">{text}</p>
      <button
        type="button"
        onClick={onOpen}
        className="px-4 py-2 min-h-[44px] rounded-lg bg-orange-700 text-white text-sm font-medium hover:bg-orange-800 sm:self-auto self-stretch"
      >
        Check them
      </button>
    </div>
  );
};

export default NeedsReviewBanner;
