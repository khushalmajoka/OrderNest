import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Navbar from "../../shop/components/Navbar";
import LoadingScreen from "../../../common/components/LoadingScreen";
import { useShop } from "../../shop/hooks/useShop";
import { clearSession } from "../../whatsNew/whatsNewStorage";
import { helpFor } from "../questions";

// Help: common questions, searchable. Each person sees only what they can do.
const HelpPage = () => {
  const navigate = useNavigate();
  const { shop, account, error, reload } = useShop();
  const [search, setSearch] = useState("");

  const topics = useMemo(() => {
    const words = search.toLowerCase().split(/\s+/).filter(Boolean);
    return helpFor(account)
      .map((t) => ({ ...t, questions: t.questions.filter((x) => words.every((w) => `${x.q} ${x.a}`.toLowerCase().includes(w))) }))
      .filter((t) => t.questions.length);
  }, [account, search]);

  const handleLogout = () => {
    clearSession();
    navigate("/shop");
  };

  if (!shop && error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-stone-50 font-poppins px-4 text-center">
        <p className="text-gray-700">{error}</p>
        <button onClick={reload} className="px-5 py-2 rounded-lg bg-orange-700 text-white hover:bg-orange-800">
          Try again
        </button>
      </div>
    );
  }
  if (!shop) return <LoadingScreen message="Opening help" />;

  return (
    <div className="min-h-screen bg-stone-50 font-poppins">
      <Navbar shop={shop} account={account} onLogout={handleLogout} />
      <main id="main" tabIndex={-1} className="scroll-mt-24 outline-none p-4 md:p-8 max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-stone-900 mb-1">Help</h1>
        <p className="text-sm text-gray-600 mb-4">Tap a question to see the answer.</p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search help..."
          aria-label="Search help"
          className="w-full border border-gray-300 rounded-lg px-3 py-3 mb-5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        {topics.length === 0 ? (
          <p role="status" className="text-center text-gray-600 py-6">Nothing found. Try another word.</p>
        ) : (
          <div className="space-y-6">
            {topics.map((t) => (
              <section key={t.title} aria-label={t.title}>
                <h2 className="font-semibold text-gray-800 mb-2">{t.title}</h2>
                <div className="space-y-2">
                  {t.questions.map((x) => (
                    <details key={x.q} className="group bg-white rounded-lg border border-stone-200">
                      <summary className="flex items-center justify-between gap-3 px-4 py-3 min-h-[48px] cursor-pointer list-none [&::-webkit-details-marker]:hidden text-sm font-medium text-gray-900">
                        {x.q}
                        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-gray-500 group-open:rotate-180" />
                      </summary>
                      <p className="px-4 pb-4 text-sm text-gray-700">{x.a}</p>
                    </details>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
        <p className="text-sm text-gray-600 mt-6">
          {account?.role === "staff" ? "Still stuck? Ask your admin." : "The latest changes are shown in the \"What's new\" window after an update."}
        </p>
      </main>
    </div>
  );
};

export default HelpPage;
