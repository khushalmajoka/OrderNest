import { Component } from "react";

// If something in the app breaks while it is on screen (or a part of the app
// cannot be downloaded), show a clear message with a Reload button instead of
// a blank white page.
class ErrorBoundary extends Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("The screen broke:", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center min-h-screen gap-4 bg-orange-50 font-poppins px-6 text-center"
      >
        <p className="text-lg font-semibold text-gray-800">Something went wrong</p>
        <p className="text-sm text-gray-600 max-w-xs">
          Please reload the page. If it keeps happening, check your internet
          and try again in a minute.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-5 py-2.5 min-h-[44px] rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          Reload
        </button>
      </div>
    );
  }
}

export default ErrorBoundary;
