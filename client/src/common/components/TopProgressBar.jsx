import { useEffect, useState } from "react";

// A thin orange bar that slides across the top of the page while something in
// the background is loading (next page of orders, a new search...). It waits a
// moment before showing, so quick loads do not flicker.
const TopProgressBar = ({ active, delay = 200 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [active, delay]);

  if (!visible) return null;

  return (
    <div
      role="progressbar"
      aria-label="Loading"
      className="fixed top-0 inset-x-0 h-1 z-50 overflow-hidden bg-orange-200/60"
    >
      <div className="h-full w-1/3 bg-orange-500 animate-slide motion-reduce:animate-none" />
    </div>
  );
};

export default TopProgressBar;
