import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import OrderNestLogo from "../../../assets/OrderNestLogoWithoutBg.png";
import { getErrorMessage } from "../../../common/utils/api";

const RESEND_SECONDS = 60;
const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400";

// After sign-up (or a login before confirming): type the code from the email.
const VerifyEmailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const startEmail = location.state?.email || "";
  const justSentCode = Boolean(location.state?.fresh); // sign-up just emailed it

  const [email, setEmail] = useState(startEmail);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(justSentCode ? RESEND_SECONDS : 0);

  useEffect(() => {
    if (wait <= 0) return undefined;
    const timer = setTimeout(() => setWait((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const base = `${process.env.REACT_APP_BASE_URL}/api/auth`;

  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(`${base}/verify-email`, { email, code: code.trim() });
      toast.success("Email confirmed. Please login.");
      navigate("/shop");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not confirm the email."));
    } finally {
      setBusy(false);
    }
  };

  const sendAgain = async () => {
    setBusy(true);
    try {
      const res = await axios.post(`${base}/resend-verification`, { email });
      toast.success(res.data.message, { duration: 6000 });
      setWait(RESEND_SECONDS);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send the code."));
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
      <form
        onSubmit={confirm}
        className="max-w-md w-full bg-white p-5 sm:p-8 rounded-2xl shadow-md space-y-4"
      >
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          Confirm your email
        </h1>
        <p className="text-sm text-gray-500 text-center">
          {startEmail ? (
            <>
              We sent a 6-digit code to <b className="break-all">{startEmail}</b>
              . It works for 10 minutes.
            </>
          ) : (
            "Type your email and the 6-digit code we sent you."
          )}
        </p>

        {!startEmail && (
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        )}
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
        <button
          type="submit"
          disabled={busy}
          className={`w-full text-white font-semibold py-2 rounded-lg transition ${
            busy ? "bg-orange-300 cursor-not-allowed" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {busy ? "Please wait..." : "Confirm email"}
        </button>
        <button
          type="button"
          disabled={busy || wait > 0 || !email}
          onClick={sendAgain}
          className="w-full text-sm text-orange-600 disabled:text-gray-400"
        >
          {wait > 0 ? `Send the code again in ${wait}s` : "Send the code again"}
        </button>
        <p className="text-center text-xs text-gray-500">
          Wrong email? Go back and{" "}
          <Link to="/shop/signup" className="text-orange-600 hover:underline">
            sign up again
          </Link>{" "}
          with the right one.
        </p>
        <p className="text-center text-sm">
          <Link to="/shop" className="text-orange-600 hover:underline">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default VerifyEmailPage;
