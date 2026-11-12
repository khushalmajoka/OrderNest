import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

// Staff: they cannot change their password alone. They ask, the admin
// approves, and then they can type a new one (within 24 hours).
const MyPasswordCard = ({ account, onRefresh, onPasswordChanged }) => {
  const change = account.passwordChange || { status: "none" };
  const approved =
    change.status === "approved" &&
    change.approvedUntil &&
    new Date(change.approvedUntil) > new Date();
  const status = change.status === "approved" && !approved ? "none" : change.status;

  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", again: "" });
  const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };
  const url = (path) => `${process.env.REACT_APP_BASE_URL}/api/staff/me/${path}`;

  const ask = async () => {
    setBusy(true);
    try {
      await axios.post(url("password-request"), {}, { headers });
      toast.success("Your admin has been asked.");
      onRefresh();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not send the request."));
    } finally {
      setBusy(false);
    }
  };

  const change_ = async (e) => {
    e.preventDefault();
    if (form.next !== form.again) {
      toast.error("The two new passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      await axios.post(
        url("password"),
        { currentPassword: form.current, newPassword: form.next },
        { headers }
      );
      toast.success("Password changed. Please login again.");
      onPasswordChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the password."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">My password</h2>

      {status === "none" && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            To change your password, your admin must approve it first.
          </p>
          <button
            onClick={ask}
            disabled={busy}
            className="w-full px-4 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-300"
          >
            Ask my admin to approve
          </button>
        </>
      )}

      {status === "requested" && (
        <>
          <p className="text-sm text-gray-600 mb-4">
            Waiting for your admin to approve. Check again after they have
            approved.
          </p>
          <button
            onClick={onRefresh}
            className="w-full px-4 py-2 rounded-lg border border-orange-500 text-orange-600 hover:bg-orange-50"
          >
            Check again
          </button>
        </>
      )}

      {status === "approved" && (
        <form onSubmit={change_} className="space-y-3">
          <p className="text-sm text-green-700">
            Your admin approved. You can set a new password until{" "}
            {new Date(change.approvedUntil).toLocaleString()}.
          </p>
          <input
            type="password"
            placeholder="Current password"
            autoComplete="current-password"
            required
            value={form.current}
            onChange={(e) => setForm({ ...form, current: e.target.value })}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="New password (at least 8 characters)"
            autoComplete="new-password"
            required
            minLength={8}
            value={form.next}
            onChange={(e) => setForm({ ...form, next: e.target.value })}
            className={inputClass}
          />
          <input
            type="password"
            placeholder="New password again"
            autoComplete="new-password"
            required
            minLength={8}
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
      )}
    </div>
  );
};

export default MyPasswordCard;
