import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const Settings = () => {
  const navigate = useNavigate();
  const handleLogout = () => {
    localStorage.clear();
    navigate("/shop");
  };

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={JSON.parse(localStorage.getItem("shop"))} onLogout={handleLogout} />
      <span className="flex items-center justify-center min-h-[40rem]">
        Under Construction...
      </span>
    </div>
  );
};

export default Settings;
