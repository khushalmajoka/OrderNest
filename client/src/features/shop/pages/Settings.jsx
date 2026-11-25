import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import StatusColorsCard from "../components/StatusColorsCard";
import MyPasswordCard from "../components/MyPasswordCard";
import ChangeEmailCard from "../components/ChangeEmailCard";
import ShopProfileCard from "../components/ShopProfileCard";
import TableColumnsCard from "../components/TableColumnsCard";
import ChangePasswordCard from "../components/ChangePasswordCard";
import SlipSettingsCard from "../components/SlipSettingsCard";
import WhatsAppMessagesCard from "../components/WhatsAppMessagesCard";
import AmountsPrivacyCard from "../components/AmountsPrivacyCard";
import CleanNamesCard from "../components/CleanNamesCard";
import CloseOldOrdersCard from "../components/CloseOldOrdersCard";
import OrderStatusesCard from "../components/OrderStatusesCard";
import WhatsAppPromptCard from "../components/WhatsAppPromptCard";
import NeedsReviewCard from "../components/NeedsReviewCard";
import SharePictureCard from "../components/SharePictureCard";
import { can, isAdmin } from "../../../common/utils/permissions";
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
          className="px-5 py-2 rounded-lg bg-orange-700 text-white hover:bg-orange-800"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!shop) {
    return <LoadingScreen message="Opening your settings" />;
  }

  return (
    <div className="min-h-screen bg-orange-50 font-poppins">
      <Navbar shop={shop} account={account} onLogout={handleLogout} />

      <div className="p-4 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-orange-700 mb-6">Settings</h1>

        {isAdmin(account) ? (
          <div className="space-y-6">
            {/* Two columns on a wide screen, one on a phone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Two columns of about the same height, so there is no big empty space */}
              <div className="space-y-6 min-w-0">
                <ShopProfileCard shop={shop} onSaved={reload} />

                {/* The developer inside a shop must not touch the owner's login */}
                {!account.devMode && <ChangeEmailCard email={account.email} onChanged={reload} />}

                <TableColumnsCard shop={shop} />
              </div>

              <div className="space-y-6 min-w-0">
                {!account.devMode && <ChangePasswordCard />}

                <OrderStatusesCard shop={shop} onSaved={reload} />

                <WhatsAppPromptCard shop={shop} onSaved={reload} />

                <NeedsReviewCard shop={shop} onSaved={reload} />

                <SharePictureCard shop={shop} onSaved={reload} />

                <StatusColorsCard shop={shop} />

                <AmountsPrivacyCard />
              </div>
            </div>

            <SlipSettingsCard shop={shop} />

            <WhatsAppMessagesCard shop={shop} />

            <CloseOldOrdersCard shop={shop} />

            <CleanNamesCard shop={shop} />
          </div>
        ) : (
          <div className="max-w-md space-y-6">
            <MyPasswordCard
              account={account}
              onRefresh={reload}
              onPasswordChanged={handleLogout}
            />

            {/* Only staff who may see amounts have anything to hide */}
            {can(account, "viewAmounts") && <AmountsPrivacyCard />}
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;
