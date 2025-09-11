const SettingCard = ({ title, description, actionLabel, onAction }) => {
  return (
    <div className="bg-white rounded-xl shadow-md p-6 max-w-md">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">{title}</h2>
      <p className="text-sm text-gray-600 mb-6">{description}</p>

      <button
        onClick={onAction}
        className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors"
      >
        {actionLabel}
      </button>
    </div>
  );
};

export default SettingCard;
