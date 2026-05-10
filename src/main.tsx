import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ensureSeed } from "./db/seed";
import { installSyncHooks } from "./lib/sync";

// Install Dexie → Supabase mirror hooks first so any subsequent DB write is
// captured. Hooks are no-ops until a user is signed in (or until env vars are
// missing — local-only mode).
installSyncHooks();

ensureSeed().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});
