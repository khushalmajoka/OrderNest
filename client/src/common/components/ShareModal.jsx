import { FaWhatsapp, FaInstagram } from "react-icons/fa"; // react-icons se
import { Download } from "lucide-react"; // lucide-react se

const ShareModal = ({ isOpen, onClose, onShare }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
      <div className="bg-white rounded-lg shadow-lg w-72 p-6 space-y-4 relative">
        <h2 className="text-lg font-semibold text-gray-800">Share Order</h2>

        <div className="flex gap-7 justify-center">
          <button
            onClick={() => onShare("whatsapp")}
            className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
          >
            <FaWhatsapp size={40} />
          </button>
          <button
            onClick={() => onShare("instagram")}
            className="p-2 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600"
          >
            <FaInstagram size={40} />
          </button>
          <button
            onClick={() => onShare("download")}
            className="p-2 bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-800"
          >
            <Download size={40} />
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute top-2 right-3 text-gray-400 hover:text-gray-600"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
