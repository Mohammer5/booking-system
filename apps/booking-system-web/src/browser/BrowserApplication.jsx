import { Navigate, Route, Routes } from "react-router";

import { AdminBootstrapPage } from "./admin-bootstrap/index.js";
import { ResponsiveApplicationShell } from "./application-shell/index.js";
import { ParticipantEntryPage } from "./participant-entry/index.js";

/**
 * Define the language-independent browser route tree.
 *
 * @returns {import("react").ReactElement} The browser application.
 */
export function BrowserApplication() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ResponsiveApplicationShell context="participant">
            <ParticipantEntryPage />
          </ResponsiveApplicationShell>
        }
      />
      <Route
        path="/admin"
        element={
          <ResponsiveApplicationShell context="admin">
            <AdminBootstrapPage />
          </ResponsiveApplicationShell>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
