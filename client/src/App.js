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
import PageTitle from "./common/components/PageTitle";
import { pages } from "./common/utils/pages";

const {
  TrackOrderPage, LoginPage, SignupPage, ForgotPasswordPage, VerifyEmailPage, DashboardPage,
  Onboarding, Settings, StaffPage, ActivityPage, ProductsPage, DeveloperPage, CatalogPage,
} = pages;

function App() {
  return (
    <Router>
      <PageTitle />
      <Toaster position="bottom-right" />
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen message="Just a moment" />}>
          <Routes>
            {/* Customer Route */}
            <Route path="/" element={<TrackOrderPage />} />
            {/* Customer catalog: opened with the secret link the shop shares */}
            <Route path="/c/:token" element={<CatalogPage />} />

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
            <Route path="/shop/products" element={<ProductsPage />} />

            {/* Developer only: no link anywhere; the server decides who gets any data */}
            <Route path="/developer" element={<DeveloperPage />} />

            {/* Unknown URL -> customer page instead of a blank screen */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
