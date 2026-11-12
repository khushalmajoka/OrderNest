import { useEffect, useState } from "react";

// true while the screen matches the CSS media query, e.g. "(max-width: 767px)"
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(
    () => window.matchMedia(query).matches
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
};

// Phones and small tablets: too narrow for the wide orders table, so orders
// are shown as cards (anything narrower than Tailwind's `lg` breakpoint)
export const useIsPhone = () => useMediaQuery("(max-width: 1023px)");
