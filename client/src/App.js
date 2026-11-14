import { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import LoadingScreen from "./common/components/LoadingScreen";
import ErrorBoundary from "./common/components/ErrorBoundary";
import { lazyWithRetry } from "./common/utils/lazyWithRetry";

// Every page is downloaded only when it is opened, so a customer who just
// tracks an order does not download the whole shop app.
const TrackOrderPage = lazyWithRetry(() => import("./features/tracking/pages/TrackOrderPage"));
const LoginPage = lazyWithRetry(() => import("./features/auth/pages/LoginPage"));
const SignupPage = lazyWithRetry(() => import("./features/auth/pages/SignupPage"));
const ForgotPasswordPage = lazyWithRetry(() => import("./features/auth/pages/ForgotPasswordPage"));
const VerifyEmailPage = lazyWithRetry(() => import("./features/auth/pages/VerifyEmailPage"));
const DashboardPage = lazyWithRetry(() => import("./features/orders/pages/DashboardPage"));
const Onboarding = lazyWithRetry(() => import("./features/shop/pages/Onboarding"));
const Settings = lazyWithRetry(() => import("./features/shop/pages/Settings"));
const StaffPage = lazyWithRetry(() => import("./features/shop/pages/StaffPage"));
const ActivityPage = lazyWithRetry(() => import("./features/shop/pages/ActivityPage"));

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Just a moment" />}>
          <Routes>
            {/* Customer Route */}
            <Route path="/" element={<TrackOrderPage />} />

            {/* Shop Routes */}
            <Route path="/shop" element={<LoginPage />} />
            <Route path="/shop/signup" element={<SignupPage />} />
            <Route path="/shop/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/shop/verify-email" element={<VerifyEmailPage />} />
            <Route path="/shop/dashboard" element={<DashboardPage />} />
            <Route path="/shop/onboarding" element={<Onboarding />} />
            <Route path="/shop/settings" element={<Settings />} />
            <Route path="/shop/staff" element={<StaffPage />} />
            <Route path="/shop/activity" element={<ActivityPage />} />

            {/* Unknown URL -> customer page instead of a blank screen */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
