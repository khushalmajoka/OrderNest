import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./features/auth/pages/LoginPage";
import DashboardPage from "./features/orders/pages/DashboardPage";
import SignupPage from "./features/auth/pages/SignupPage";
import Onboarding from "./features/shop/pages/Onboarding";
import TrackOrderPage from "./features/tracking/pages/TrackOrderPage";
import { Toaster } from "react-hot-toast";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import Settings from "./features/shop/pages/Settings";

function App() {
  return (
    <Router>
      <LocalizationProvider dateAdapter={AdapterDateFns}>
        <Toaster position="bottom-right" />
        <Routes>
          {/* Customer Route */}
          <Route path="/" element={<TrackOrderPage />} />

          {/* Shop Routes */}
          <Route path="/shop" element={<LoginPage />} />
          <Route path="/shop/signup" element={<SignupPage />} />
          <Route path="/shop/dashboard" element={<DashboardPage />} />
          <Route path="/shop/onboarding" element={<Onboarding />} />
          <Route path="/shop/settings" element={<Settings />} />
        </Routes>
      </LocalizationProvider>
    </Router>
  );
}

export default App;
