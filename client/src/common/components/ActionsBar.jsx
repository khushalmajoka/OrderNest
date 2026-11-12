import { Download, Plus, Upload } from "lucide-react";

const ActionsBar = ({ onCreateClick, onFileChange, onExportClick }) => (
  <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
    {onCreateClick && (
    <button
      onClick={onCreateClick}
      className="flex flex-1 md:flex-none items-center justify-center gap-1 px-3 md:px-4 py-2 text-sm md:text-base whitespace-nowrap bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition"
    >
      <Plus size={20} /> Create Order
    </button>
    )}

    {onFileChange && (
    <label className="flex flex-1 md:flex-none items-center justify-center gap-1 cursor-pointer px-3 md:px-4 py-2 text-sm md:text-base whitespace-nowrap bg-orange-500 text-white rounded-md shadow hover:bg-orange-600 transition">
      <Upload size={20} /> Bulk Upload
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        onChange={onFileChange}
        className="hidden"
      />
    </label>
    )}

    {onExportClick && (
      <button
        onClick={onExportClick}
        className="flex flex-1 md:flex-none items-center justify-center gap-1 px-3 md:px-4 py-2 text-sm md:text-base whitespace-nowrap bg-white text-orange-600 border border-orange-500 rounded-md shadow-sm hover:bg-orange-50 transition"
      >
        <Download size={20} /> Export
      </button>
    )}
  </div>
);

export default ActionsBar;
