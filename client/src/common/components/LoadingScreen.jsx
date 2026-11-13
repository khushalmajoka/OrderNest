import { Truck } from "lucide-react";

// Full-screen loading page, for when a whole page is on its way (before there
// is anything to show). The page keeps the app's normal cream colour, so the
// top, bottom and notch areas never change colour. For parts of a page that
// are loading, use the skeletons instead (see Skeleton.jsx).
const LoadingScreen = ({ message = "Just a moment" }) => (
  <div
    role="status"
    aria-live="polite"
    className="flex flex-col items-center justify-center gap-3 min-h-screen bg-orange-50 font-poppins px-6"
  >
    <div className="relative w-full max-w-xs h-12 overflow-hidden" aria-hidden="true">
      <Truck
        size={34}
        strokeWidth={1.75}
        className="absolute bottom-2 text-orange-600 animate-drive motion-reduce:animate-none motion-reduce:left-1/2 motion-reduce:-translate-x-1/2"
      />
      <div className="absolute inset-x-0 bottom-1.5 border-b-2 border-dashed border-orange-300" />
    </div>
    <p className="text-sm text-orange-800">{message}</p>
  </div>
);

export default LoadingScreen;
