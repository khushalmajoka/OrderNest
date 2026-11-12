import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import OrderNestLogo from "../../../assets/OrderNestLogoWithoutBg.png";
import { getErrorMessage } from "../../../common/utils/api";
import PasswordInput from "../../../common/components/PasswordInput";

const RESEND_SECONDS = 60;
const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400";
const buttonClass = (busy) =>
  `w-full text-white font-semibold py-2 rounded-lg transition ${
    busy ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
  }`;

// Admin forgot-password: 1) email  ->  2) code from the email + new password
const ForgotPasswordPage = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [again, setAgain] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0); // seconds until "send again" works

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const base = `${process.env.REACT_APP_BASE_URL}/api/auth`;

  const sendCode = async (e) => {
    e?.preventDefault();
    setBusy(true);
    try {
      const res = await axios.post(`${base}/forgot-password`, { email });
      toast.success(res.data.message, { duration: 6000 });
      setStep(2);
      setWait(RESEND_SECONDS);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send the code."));
    } finally {
      setBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (password !== again) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await axios.post(`${base}/reset-password`, {
        email,
        code: code.trim(),
        newPassword: password,
      });
      toast.success("Password changed. Please login.");
      navigate("/shop");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row items-center justify-center md:justify-evenly gap-6 bg-gradient-to-br from-orange-100 to-gray-100 px-4 py-8 font-poppins">
      <img
        src={OrderNestLogo}
        alt="OrderNest Logo"
        className="w-40 md:w-auto max-w-full h-auto"
      />
      <div className="max-w-md w-full bg-white p-5 sm:p-8 rounded-2xl shadow-md">
        <h1 className="text-2xl font-bold text-gray-800 mb-2 text-center">
          Forgot password
        </h1>

        {step === 1 ? (
          <form className="space-y-5" onSubmit={sendCode}>
            <p className="text-sm text-gray-500 text-center">
              Type your email. We will send you a 6-digit code.
            </p>
            <input
              type="email"
              required
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass(busy)}>
              {busy ? "Sending..." : "Send code"}
            </button>
            <p className="text-xs text-gray-500 text-center">
              Staff: please ask your admin to set a new password for you.
            </p>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={changePassword}>
            <p className="text-sm text-gray-500 text-center">
              We sent a code to <b className="break-all">{email}</b>. It works
              for 10 minutes.
            </p>
            <input
              inputMode="numeric"
              maxLength={6}
              required
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`${inputClass} tracking-widest text-center text-lg`}
            />
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="New password (at least 8 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
            <PasswordInput
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="New password again"
              value={again}
              onChange={(e) => setAgain(e.target.value)}
              className={inputClass}
            />
            <button type="submit" disabled={busy} className={buttonClass(busy)}>
              {busy ? "Saving..." : "Change password"}
            </button>
            <button
              type="button"
              disabled={busy || wait > 0}
              onClick={sendCode}
              className="w-full text-sm text-orange-600 disabled:text-gray-400"
            >
              {wait > 0 ? `Send the code again in ${wait}s` : "Send the code again"}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-gray-600 mt-5">
          <Link to="/shop" className="text-orange-600 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
