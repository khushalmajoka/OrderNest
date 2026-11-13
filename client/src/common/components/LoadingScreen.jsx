import loadingGif from "../../assets/Loading.gif";

// Full-screen loading page. The page itself keeps the app's normal cream
// colour (so the top, the bottom, the notch area and the area shown when you
// pull the page down never change colour); the animation, which has its own
// peach background, sits on it as a small rounded card.
const LoadingScreen = () => (
  <div className="flex items-center justify-center min-h-screen bg-orange-50 font-poppins px-4">
    <img
      src={loadingGif}
      alt="loading"
      className="max-w-full h-auto rounded-2xl shadow-sm"
    />
  </div>
);

export default LoadingScreen;
