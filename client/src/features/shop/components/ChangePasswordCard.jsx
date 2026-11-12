import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// Admin: change my password. Other devices are logged out; this one stays.
const ChangePasswordCard = () => {
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.next !== form.again) {
      toast.error("The two new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/auth/change-password`,
        { currentPassword: form.current, newPassword: form.next },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      // This device keeps working with the fresh login
      localStorage.setItem("token", res.data.token);
      toast.success(res.data.message, { duration: 6000 });
      setForm({ current: "", next: "", again: "" });
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={submit}
      className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-md space-y-3"
    >
      <h2 className="text-lg font-semibold text-gray-800">Change password</h2>
      <p className="text-sm text-gray-600">
        You will stay logged in here. Other phones and computers are logged
        out.
      </p>
      <input
        type="password"
        required
        autoComplete="current-password"
        placeholder="Current password"
        value={form.current}
        onChange={(e) => setForm({ ...form, current: e.target.value })}
        className={inputClass}
      />
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="New password (at least 8 characters)"
        value={form.next}
        onChange={(e) => setForm({ ...form, next: e.target.value })}
        className={inputClass}
      />
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        placeholder="New password again"
        value={form.again}
        onChange={(e) => setForm({ ...form, again: e.target.value })}
        className={inputClass}
      />
      <button
        type="submit"
        disabled={busy}
        className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-300"
      >
        {busy ? "Saving..." : "Change password"}
      </button>
    </form>
  );
};

export default ChangePasswordCard;
