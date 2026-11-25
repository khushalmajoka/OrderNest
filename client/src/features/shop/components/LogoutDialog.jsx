// "Log out?" question, shown before logging out (a tap by mistake does nothing).
const LogoutDialog = ({ onStay, onLogout }) => (
  <div
    className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4"
    onMouseDown={(e) => {
      if (e.target === e.currentTarget) onStay();
    }}
  >
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="logout-title"
      className="bg-white rounded-lg shadow-lg w-full max-w-xs p-6 animate-fade-up motion-reduce:animate-none"
    >
      <h2 id="logout-title" className="text-lg font-semibold text-gray-800 mb-2">
        Log out?
      </h2>
      <p className="text-sm text-gray-600 mb-5">You will need to login again.</p>
      <div className="flex justify-end gap-3">
        <button
          autoFocus
          onClick={onStay}
          className="px-4 py-2 min-h-[44px] text-gray-700 border rounded hover:bg-gray-100"
        >
          Stay
        </button>
        <button
          onClick={onLogout}
          className="px-4 py-2 min-h-[44px] text-white rounded bg-orange-700 hover:bg-orange-800"
        >
          Log out
        </button>
      </div>
    </div>
  </div>
);

export default LogoutDialog;
