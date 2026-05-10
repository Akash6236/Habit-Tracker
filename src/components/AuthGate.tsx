import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "../lib/auth";
import { isCloudEnabled } from "../lib/supabase";
import { AuthPage } from "../pages/Auth";
import { pullAll, setSyncUser, wipeLocalAfterSignOut } from "../lib/sync";
import { ensureSeed } from "../db/seed";
import { useToast } from "./ui/Toast";

interface Props {
  children: ReactNode;
}

/**
 * Decides what to render:
 *   • cloud disabled → just render children (local-only mode)
 *   • cloud enabled, no session → AuthPage
 *   • cloud enabled, session → pull cloud data once, then render children
 */
export function AuthGate({ children }: Props) {
  const { loading, session, user } = useAuth();
  const [syncing, setSyncing] = useState(false);
  const lastUserId = useRef<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!isCloudEnabled) return;
    if (loading) return;

    // User changed (signed in / different user)
    if (user && user.id !== lastUserId.current) {
      lastUserId.current = user.id;
      setSyncing(true);
      (async () => {
        try {
          // Re-seed defaults if local DB is empty (first login on a new device).
          await ensureSeed();
          const { counts } = await pullAll(user.id);
          const total = Object.values(counts).reduce((a, b) => a + b, 0);
          if (total > 0) toast(`Synced ${total} item${total === 1 ? "" : "s"} from cloud`, "success");
        } catch (e) {
          console.error("[sync] pull failed", e);
          toast("Sync failed — running offline", "error");
        } finally {
          setSyncing(false);
        }
      })();
    }

    // Signed out
    if (!user && lastUserId.current !== null) {
      lastUserId.current = null;
      setSyncUser(null);
      // Don't auto-wipe here — wipe is triggered by the explicit signOut flow
      // in Settings, so users that just had session expire keep their data.
    }
  }, [loading, user, toast]);

  if (!isCloudEnabled) return <>{children}</>;

  if (loading) return <CenterLoader text="Loading…" />;
  if (!session) return <AuthPage />;
  if (syncing) return <CenterLoader text="Syncing your data…" />;

  return <>{children}</>;
}

/** Helper exposed to Settings so it can wipe local before signOut. */
export async function performSignOutWipe() {
  await wipeLocalAfterSignOut();
}

function CenterLoader({ text }: { text: string }) {
  return (
    <div className="app-bg min-h-screen grid place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-glass !rounded-2xl px-5 py-4 flex items-center gap-3 text-sm text-ink"
      >
        <Loader2 size={16} className="animate-spin text-brand-500" />
        {text}
      </motion.div>
    </div>
  );
}
