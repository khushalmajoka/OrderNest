import { useEffect } from "react";
import loadingGif from "../../assets/Loading.gif";

// The animation has this peach colour built into the picture.
const LOADING_COLOUR = "#FACFBC";

// Full-screen loading page. While it shows, the whole page (also the area that
// appears when you pull the page down, and the notch and status bar area on a
// phone) turns the same peach colour, so there are no mismatched bands. The
// normal colours come back as soon as it goes away.
const LoadingScreen = () => {
  useEffect(() => {
    const html = document.documentElement;
    const meta = document.querySelector('meta[name="theme-color"]');
    const oldPage = html.style.backgroundColor;
    const oldTheme = meta ? meta.getAttribute("content") : null;

    html.style.backgroundColor = LOADING_COLOUR;
    if (meta) meta.setAttribute("content", LOADING_COLOUR);

    return () => {
      html.style.backgroundColor = oldPage;
      if (meta && oldTheme !== null) meta.setAttribute("content", oldTheme);
    };
  }, []);

  return (
    <div
      className="flex items-center justify-center min-h-screen font-poppins"
      style={{ backgroundColor: LOADING_COLOUR }}
    >
      <img src={loadingGif} alt="loading" />
    </div>
  );
};

export default LoadingScreen;
