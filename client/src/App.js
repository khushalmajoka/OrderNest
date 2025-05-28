import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
// import LandingPage from "./pages/LandingPage";
import SignupPage from "./pages/SignupPage";
import Onboarding from "./pages/Onboarding";
import { Toaster } from "react-hot-toast";

function App() {
  return (
    <Router>
      <Toaster position="bottom-right" />
      <Routes>
        {/* <Route path="/" element={<LandingPage />} /> */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage/>} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/onboarding" element={<Onboarding />} />
        {/* <Route path="/create-order" element={<CreateOrder />} /> */}
      </Routes>
    </Router>
  );
}


export default App;
