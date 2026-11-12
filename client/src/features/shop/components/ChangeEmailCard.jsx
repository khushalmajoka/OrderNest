import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// Admin: change the email used to login and to get password codes.
// The code is sent to the NEW address, so the change only works if it is real.
const ChangeEmailCard = ({ email, onChanged }) => {
  const [step, setStep] = useState(1);
  const [newEmail, setNewEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
  const base = `${process.env.REACT_APP_BASE_URL}/api/auth/change-email`;

  const sendCode = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await axios.post(`${base}/request`, { newEmail, password }, { headers });
      toast.success(res.data.message, { duration: 6000 });
      setStep(2);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send the code."));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await axios.post(`${base}/confirm`, { code }, { headers });
      toast.success("Your email was changed. Use it to login next time.");
      setStep(1);
      setNewEmail("");
      setPassword("");
      setCode("");
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the email."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">My email</h2>
      <p className="text-sm text-gray-600 mb-1">You login with this email.</p>
      <p className="text-sm font-medium text-gray-800 break-all mb-4">{email}</p>
      <p className="text-xs text-gray-500 mb-4">
        Password codes are sent to this email. If it is not a real email you
        can open, change it here.
      </p>

      {step === 1 ? (
        <form onSubmit={sendCode} className="space-y-3">
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="New email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className={inputClass}
          />
          <input
            type="password"
            required
            autoComplete="current-password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-300"
          >
            {busy ? "Sending..." : "Send code to the new email"}
          </button>
        </form>
      ) : (
        <form onSubmit={confirm} className="space-y-3">
          <p className="text-sm text-gray-600">
            Type the 6-digit code we sent to <b className="break-all">{newEmail}</b>.
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
          <button
            type="submit"
            disabled={busy}
            className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-300"
          >
            {busy ? "Saving..." : "Change email"}
          </button>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-sm text-gray-600 underline"
          >
            Use a different email
          </button>
        </form>
      )}
    </div>
  );
};

export default ChangeEmailCard;
