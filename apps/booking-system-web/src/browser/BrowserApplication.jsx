import { Navigate, Route, Routes } from "react-router";

import { AdminBootstrapPage } from "./admin-bootstrap/index.js";

/**
 * Define the language-independent browser route tree.
 *
 * @returns {import("react").ReactElement} The browser application.
 */
export function BrowserApplication() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminBootstrapPage />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
