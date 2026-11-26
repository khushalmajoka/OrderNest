import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import SettingsSections from "../components/SettingsSections";
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

      <main id="main" tabIndex={-1} className="scroll-mt-24 outline-none p-4 md:p-8 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-orange-700 mb-6">Settings</h1>

        {isAdmin(account) ? (
          <SettingsSections
            sections={[
              {
                id: "shop",
                label: "Shop",
                content: (
                  <div className="space-y-6">
                    <div className="max-w-xl">
                      <ShopProfileCard shop={shop} onSaved={reload} />
                    </div>
                    <SlipSettingsCard shop={shop} />
                    <div className="max-w-xl">
                      <SharePictureCard shop={shop} onSaved={reload} />
                    </div>
                  </div>
                ),
              },
              {
                id: "orders",
                label: "Orders",
                content: (
                  // Two columns on a wide screen, one on a phone
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-6 min-w-0">
                      <OrderStatusesCard shop={shop} onSaved={reload} />
                      <NeedsReviewCard shop={shop} onSaved={reload} />
                      <AmountsPrivacyCard />
                    </div>
                    <div className="space-y-6 min-w-0">
                      <TableColumnsCard shop={shop} />
                      <StatusColorsCard shop={shop} />
                    </div>
                  </div>
                ),
              },
              {
                id: "whatsapp",
                label: "WhatsApp",
                content: (
                  <div className="space-y-6">
                    <div className="max-w-xl">
                      <WhatsAppPromptCard shop={shop} onSaved={reload} />
                    </div>
                    <WhatsAppMessagesCard shop={shop} />
                  </div>
                ),
              },
              // The developer inside a shop must not touch the owner's login
              ...(account.devMode
                ? []
                : [
                    {
                      id: "account",
                      label: "My login",
                      content: (
                        <div className="max-w-xl space-y-6">
                          <ChangeEmailCard email={account.email} onChanged={reload} />
                          <ChangePasswordCard />
                        </div>
                      ),
                    },
                  ]),
              {
                id: "cleanup",
                label: "Clean up",
                content: (
                  <div className="space-y-6">
                    <CloseOldOrdersCard shop={shop} />
                    <CleanNamesCard shop={shop} />
                  </div>
                ),
              },
            ]}
          />
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
      </main>
    </div>
  );
};

export default Settings;
