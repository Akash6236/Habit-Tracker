import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Header } from "./components/Header";
import { BottomNav, Sidebar, type Tab } from "./components/Navigation";
import { TodayPage } from "./pages/Today";
import { HabitsPage } from "./pages/Habits";
import { GrowthPage } from "./pages/Growth";
import { InsightsPage } from "./pages/Insights";
import { SettingsPage, type AccentKey } from "./pages/Settings";
import { ToastProvider } from "./components/ui/Toast";
import { AuthGate } from "./components/AuthGate";
import { getSetting, setSetting } from "./db/database";

const THEME_KEY = "ui.theme";
const ACCENT_KEY = "ui.accent";
const FOCUS_KEY = "ui.focusMode";

export default function App() {
  const [tab, setTab] = useState<Tab>("today");
  const [isDark, setIsDark] = useState(false);
  const [accent, setAccent] = useState<AccentKey>("indigo");
  const [focusMode, setFocusMode] = useState(false);
  const [newHabitTrigger, setNewHabitTrigger] = useState(0);

  useEffect(() => {
    (async () => {
      const t = await getSetting(THEME_KEY);
      const a = (await getSetting(ACCENT_KEY)) as AccentKey | undefined;
      const f = await getSetting(FOCUS_KEY);
      const dark = t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
      setIsDark(dark);
      document.documentElement.classList.toggle("dark", dark);
      if (a) {
        setAccent(a);
        document.documentElement.dataset.accent = a;
      } else {
        document.documentElement.dataset.accent = "indigo";
      }
      if (f === "1") {
        setFocusMode(true);
        document.documentElement.dataset.mode = "focus";
      }
    })();
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    setSetting(THEME_KEY, next ? "dark" : "light");
  }

  function changeAccent(a: AccentKey) {
    setAccent(a);
    document.documentElement.dataset.accent = a;
    setSetting(ACCENT_KEY, a);
  }

  function changeFocusMode(v: boolean) {
    setFocusMode(v);
    if (v) document.documentElement.dataset.mode = "focus";
    else delete document.documentElement.dataset.mode;
    setSetting(FOCUS_KEY, v ? "1" : "0");
  }

  function handleQuickAdd() {
    setTab("habits");
    // Defer to allow Habits page to mount before consuming the trigger
    setTimeout(() => setNewHabitTrigger((n) => n + 1), 60);
  }

  return (
    <ToastProvider>
      <AuthGate>
      <div className="app-bg min-h-screen">
        <Sidebar active={tab} onChange={setTab} onAdd={handleQuickAdd} />
        <Header onToggleTheme={toggleTheme} isDark={isDark} />

        <main className="lg:pl-64">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-28 lg:pb-10 lg:pt-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {tab === "today" && <TodayPage onGoTo={(t) => setTab(t)} />}
                {tab === "habits" && <HabitsPage triggerNew={newHabitTrigger} />}
                {tab === "growth" && <GrowthPage />}
                {tab === "insights" && <InsightsPage />}
                {tab === "settings" && (
                  <SettingsPage
                    isDark={isDark}
                    onToggleTheme={toggleTheme}
                    accent={accent}
                    onAccent={changeAccent}
                    focusMode={focusMode}
                    onFocusMode={changeFocusMode}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <BottomNav active={tab} onChange={setTab} onAdd={handleQuickAdd} />
      </div>
      </AuthGate>
    </ToastProvider>
  );
}
