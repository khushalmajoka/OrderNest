// Building blocks for "skeleton" loading screens: soft pulsing shapes in the
// place and size of the real content, so nothing jumps when it arrives.

// One pulsing shape. Give it a size, for example <Bar className="h-4 w-1/2" />
export const Bar = ({ className = "" }) => (
  <div
    className={`rounded bg-orange-200/70 animate-pulse motion-reduce:animate-none ${className}`}
  />
);

// Wraps a skeleton so screen readers hear "Loading ..." instead of nothing.
export const SkeletonRegion = ({ label, className = "", children }) => (
  <div role="status" aria-busy="true" className={className}>
    <span className="sr-only">{label}</span>
    <div aria-hidden="true">{children}</div>
  </div>
);
