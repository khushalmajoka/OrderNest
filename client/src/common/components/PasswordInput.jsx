import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// A password box with an eye button to show what was typed.
// Takes the same props as a normal <input> (the type is handled here).
const PasswordInput = ({ className = "", ...props }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        {...props}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        title={visible ? "Hide password" : "Show password"}
        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100"
      >
        {visible ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
};

export default PasswordInput;
