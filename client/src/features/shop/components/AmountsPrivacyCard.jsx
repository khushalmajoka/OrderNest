import { useListAmountsHidden } from "../../orders/hooks/useAmountsHidden";

// Settings card: hide Total, Advance and Balance in the order list with dots.
// (The eye on the "Balance to collect" box is separate.) Saved on this device.
const AmountsPrivacyCard = () => {
  const [hidden, , setHidden] = useListAmountsHidden(localStorage.getItem("userId"));

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Amounts in the order list</h2>
      <p className="text-sm text-gray-600 mb-4">
        Hide Total, Advance and Balance in the orders with dots, for when someone is
        looking at your screen. The eye on the "Balance to collect" box on the
        Orders page is separate. This choice is saved on this device only.
      </p>

      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-800">Hide Total, Advance and Balance</p>
          <p className="text-xs text-gray-500">{hidden ? "Hidden with dots" : "Shown"}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={hidden}
          aria-label="Hide Total, Advance and Balance in the order list"
          onClick={() => setHidden(!hidden)}
          className={`relative w-11 h-6 shrink-0 rounded-full transition ${
            hidden ? "bg-orange-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              hidden ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>
    </div>
  );
};

export default AmountsPrivacyCard;
