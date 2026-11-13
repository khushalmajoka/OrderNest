import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import Navbar from "../components/Navbar";
import LoadingScreen from "../../../common/components/LoadingScreen";
import { Bar, SkeletonRegion } from "../../../common/components/Skeleton";
import { useShop } from "../hooks/useShop";
import { getErrorMessage } from "../../../common/utils/api";
import { clearSession } from "../../whatsNew/whatsNewStorage";
import PasswordInput from "../../../common/components/PasswordInput";

// Viewing orders is always allowed; these are the extras the admin can give.
const POWERS = [
  ["createOrders", "Create orders"],
  ["editOrders", "Edit orders"],
  ["deleteOrders", "Delete orders"],
  ["shareSlip", "Delivery slip and Share"],
];

const inputClass =
  "w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400";

const api = (method, path, data) =>
  axios({
    method,
    url: `${process.env.REACT_APP_BASE_URL}/api/staff${path}`,
    data,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

const PowerBoxes = ({ value, onChange, disabled }) => (
  <div className="space-y-2">
    {POWERS.map(([key, label]) => (
      <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          disabled={disabled}
          checked={Boolean(value[key])}
          onChange={(e) => onChange({ ...value, [key]: e.target.checked })}
          className="w-4 h-4 accent-orange-500"
        />
        {label}
      </label>
    ))}
  </div>
);

// ---- Add a new staff member
const AddStaffForm = ({ onAdded }) => {
  const empty = { name: "", username: "", password: "", confirm: "", permissions: {} };
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const { confirm, ...staff } = form; // the server does not need the second copy
      await api("post", "", staff);
      toast.success("Staff member added.");
      setForm(empty);
      onAdded();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not add the staff member."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-3">
      <h2 className="text-lg font-semibold text-gray-800">Add staff</h2>
      <input
        placeholder="Name"
        required
        value={form.name}
        onChange={(e) => setForm({ ...form, name: e.target.value })}
        className={inputClass}
      />
      <input
        placeholder="Username (for example ravi.shop1)"
        required
        autoCapitalize="none"
        value={form.username}
        onChange={(e) => setForm({ ...form, username: e.target.value })}
        className={inputClass}
      />
      <PasswordInput
        placeholder="Password (at least 8 characters)"
        required
        minLength={8}
        autoComplete="new-password"
        value={form.password}
        onChange={(e) => setForm({ ...form, password: e.target.value })}
        className={inputClass}
      />
      <PasswordInput
        placeholder="Password again"
        required
        minLength={8}
        autoComplete="new-password"
        value={form.confirm}
        onChange={(e) => setForm({ ...form, confirm: e.target.value })}
        className={inputClass}
      />
      <div>
        <p className="text-sm font-medium text-gray-700 mb-1">
          What can they do? (They can always view orders.)
        </p>
        <PowerBoxes
          value={form.permissions}
          onChange={(permissions) => setForm({ ...form, permissions })}
        />
      </div>
      <button
        type="submit"
        disabled={busy}
        className="w-full sm:w-auto px-5 py-2 rounded-lg bg-orange-500 text-white font-medium hover:bg-orange-600 disabled:bg-orange-300"
      >
        {busy ? "Adding..." : "Add staff"}
      </button>
    </form>
  );
};

// ---- One staff member
const StaffCard = ({ member, onChanged }) => {
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordAgain, setNewPasswordAgain] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // The boxes change at once on screen, and the choices are sent in order, so
  // two quick taps never cancel each other out. The list is only reloaded
  // when every choice has been saved (so the boxes do not jump around).
  const [powers, setPowers] = useState(member.permissions);
  const saving = useRef(Promise.resolve());
  const pending = useRef(0);
  useEffect(() => {
    if (pending.current === 0) setPowers(member.permissions);
  }, [member.permissions]);

  const changePowers = (next) => {
    setPowers(next);
    pending.current += 1;
    saving.current = saving.current
      .then(() => api("put", `/${member._id}`, { permissions: next }))
      .then(() => toast.success("Saved."))
      .catch((err) =>
        toast.error(getErrorMessage(err, "Could not save. Please try again."))
      )
      .finally(() => {
        pending.current -= 1;
        if (pending.current === 0) onChanged(); // show what is really saved
      });
  };

  const run = async (call, success) => {
    setBusy(true);
    try {
      await call();
      if (success) toast.success(success);
      onChanged();
    } catch (err) {
      toast.error(getErrorMessage(err, "That did not work. Please try again."));
    } finally {
      setBusy(false);
    }
  };

  const request = member.passwordChange.status;

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-800 break-words">{member.name}</p>
          <p className="text-sm text-gray-500 break-all">@{member.username}</p>
        </div>
        <label className="flex items-center gap-2 text-sm shrink-0">
          <span className={member.active ? "text-green-700" : "text-gray-500"}>
            {member.active ? "On" : "Off"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={member.active}
            aria-label={`Account for ${member.name}`}
            disabled={busy}
            onClick={() =>
              run(
                () => api("put", `/${member._id}`, { active: !member.active }),
                member.active ? "Account turned off." : "Account turned on."
              )
            }
            className={`relative w-11 h-6 rounded-full transition ${
              member.active ? "bg-orange-500" : "bg-gray-300"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                member.active ? "translate-x-5" : ""
              }`}
            />
          </button>
        </label>
      </div>

      <PowerBoxes value={powers} onChange={changePowers} />

      {request === "requested" && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-300 p-3 space-y-2">
          <p className="text-sm text-yellow-900">
            {member.name} asked to change their password.
          </p>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() =>
                run(
                  () => api("post", `/${member._id}/password-request/approve`),
                  "Approved. They can change it for 24 hours."
                )
              }
              className="flex-1 py-2 rounded-md bg-green-600 text-white text-sm hover:bg-green-700"
            >
              Approve
            </button>
            <button
              disabled={busy}
              onClick={() =>
                run(() => api("post", `/${member._id}/password-request/deny`), "Request denied.")
              }
              className="flex-1 py-2 rounded-md border border-gray-400 text-gray-700 text-sm hover:bg-gray-50"
            >
              Deny
            </button>
          </div>
        </div>
      )}
      {request === "approved" && (
        <p className="text-sm text-green-700">
          Password change approved. They can change it until{" "}
          {new Date(member.passwordChange.approvedUntil).toLocaleString()}.
        </p>
      )}

      {showReset && (
        <div className="space-y-2">
          <PasswordInput
            placeholder="New password (at least 8 characters)"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
          <PasswordInput
            placeholder="New password again"
            autoComplete="new-password"
            value={newPasswordAgain}
            onChange={(e) => setNewPasswordAgain(e.target.value)}
            className={inputClass}
          />
          {newPasswordAgain !== "" && newPassword !== newPasswordAgain && (
            <p className="text-xs text-red-600">The two passwords do not match.</p>
          )}
          <div className="flex gap-2">
            <button
              disabled={busy || newPassword.length < 8 || newPassword !== newPasswordAgain}
              onClick={() =>
                run(async () => {
                  await api("put", `/${member._id}/password`, { password: newPassword });
                  setNewPassword("");
                  setNewPasswordAgain("");
                  setShowReset(false);
                }, "New password saved. Tell it to the staff member.")
              }
              className="flex-1 py-2 rounded-md bg-orange-500 text-white text-sm hover:bg-orange-600 disabled:bg-orange-300"
            >
              Save password
            </button>
            <button
              onClick={() => {
                setShowReset(false);
                setNewPassword("");
                setNewPasswordAgain("");
              }}
              className="flex-1 py-2 rounded-md border text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-2 pt-3 border-t">
        {!showReset && (
          <button
            onClick={() => setShowReset(true)}
            className="px-3 py-2 rounded-md border text-sm text-gray-700 hover:bg-gray-50"
          >
            Set new password
          </button>
        )}
        <button
          disabled={busy}
          onClick={() => {
            if (!confirmDelete) {
              setConfirmDelete(true);
              setTimeout(() => setConfirmDelete(false), 4000);
              return;
            }
            run(() => api("delete", `/${member._id}`), "Staff member removed.");
          }}
          className={`px-3 py-2 rounded-md text-sm ${
            confirmDelete
              ? "bg-red-600 text-white"
              : "border border-red-300 text-red-600 hover:bg-red-50"
          }`}
        >
          {confirmDelete ? "Tap again to delete" : "Delete"}
        </button>
      </div>
    </div>
  );
};

// ---- Shape of the staff list while it loads
const StaffSkeleton = () => (
  <SkeletonRegion label="Loading your staff" className="space-y-6">
    {[0, 1].map((i) => (
      <div key={i} className="bg-white rounded-xl shadow-md p-4 sm:p-6 space-y-4 mb-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 w-1/2">
            <Bar className="h-4 w-2/3" />
            <Bar className="h-3 w-1/2" />
          </div>
          <Bar className="h-6 w-11 rounded-full" />
        </div>
        <div className="space-y-3">
          <Bar className="h-4 w-36" />
          <Bar className="h-4 w-32" />
          <Bar className="h-4 w-40" />
          <Bar className="h-4 w-44" />
        </div>
        <div className="flex gap-2 pt-3 border-t">
          <Bar className="h-9 w-36" />
          <Bar className="h-9 w-20" />
        </div>
      </div>
    ))}
  </SkeletonRegion>
);

// ---- The page (admin only)
const StaffPage = () => {
  const navigate = useNavigate();
  const { shop, account, error, reload } = useShop();
  const [staff, setStaff] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api("get", "");
      setStaff(res.data.staff);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not load your staff."));
    }
  }, []);

  const isAdminAccount = account?.role === "admin";
  useEffect(() => {
    if (account && !isAdminAccount) navigate("/shop/dashboard"); // staff: not allowed here
    if (isAdminAccount) load();
  }, [account, isAdminAccount, navigate, load]);

  const handleLogout = () => {
    clearSession();
    navigate("/shop");
  };

  if (!shop && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-orange-50 font-poppins px-4 text-center">
        <p className="text-gray-700">{error}</p>
        <button
          onClick={reload}
          className="px-5 py-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600"
        >
          Try again
        </button>
      </div>
    );
  }
  if (!shop || !isAdminAccount) {
    return <LoadingScreen message="Opening your staff" />;
  }

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={shop} account={account} onLogout={handleLogout} />

      <div className="p-4 md:p-8 space-y-6 max-w-2xl">
        <div>
          <h1 className="text-2xl font-bold text-orange-700">Staff</h1>
          <p className="text-sm text-gray-600 mt-1">
            Staff log in with their username. You decide what they can do. If a
            staff member asks to change their password, you will see it here.
          </p>
        </div>

        <AddStaffForm onAdded={load} />

        {staff === null ? (
          <StaffSkeleton />
        ) : staff.length === 0 ? (
          <p className="text-gray-500">No staff yet.</p>
        ) : (
          staff.map((member) => (
            <StaffCard key={member._id} member={member} onChanged={load} />
          ))
        )}
      </div>
    </div>
  );
};

export default StaffPage;
