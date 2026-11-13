import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusColorsCard from "../components/StatusColorsCard";
import MyPasswordCard from "../components/MyPasswordCard";
import ChangeEmailCard from "../components/ChangeEmailCard";
import TableColumnsCard from "../components/TableColumnsCard";
import ChangePasswordCard from "../components/ChangePasswordCard";
import SlipSettingsCard from "../components/SlipSettingsCard";
import { isAdmin } from "../../../common/utils/permissions";
import { clearSession } from "../../whatsNew/whatsNewStorage";
import { useShop } from "../hooks/useShop";
import LoadingScreen from "../../../common/components/LoadingScreen";

const Settings = () => {
  const navigate = useNavigate();
  const { shop, account, error, reload } = useShop();

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

  if (!shop) {
    return <LoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={shop} account={account} onLogout={handleLogout} />

      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-2xl font-bold text-orange-700 mb-6">Settings</h1>

        {isAdmin(account) ? (
          <>
            <ChangeEmailCard email={account.email} onChanged={reload} />

            <ChangePasswordCard />

            <TableColumnsCard shop={shop} />

            <StatusColorsCard shop={shop} />

            <SlipSettingsCard shop={shop} />
          </>
        ) : (
          <MyPasswordCard
            account={account}
            onRefresh={reload}
            onPasswordChanged={handleLogout}
          />
        )}
      </div>
    </div>
  );
};

export default Settings;
