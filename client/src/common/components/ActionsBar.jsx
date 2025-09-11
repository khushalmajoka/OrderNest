import { Plus, Upload } from "lucide-react";

const ActionsBar = ({ onCreateClick, onFileChange }) => (
  <div className="flex items-center gap-2">
    <button
      onClick={onCreateClick}
      className="flex items-center gap-1 px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition"
    >
      <Plus /> Create Order
    </button>

    <label className="flex items-center gap-1 cursor-pointer px-4 py-2 bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition">
      <Upload /> Bulk Upload
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={onFileChange}
        className="hidden"
      />
    </label>
  </div>
);

export default ActionsBar;
