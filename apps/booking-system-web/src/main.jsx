import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { BrowserRouter } from "react-router";

import {
  BrowserApplication,
  createAdminBootstrapI18n,
} from "./browser/index.js";

const container = document.getElementById("root");

if (container === null) {
  throw new Error("Browser root element is missing.");
}

const i18n = await createAdminBootstrapI18n();
const queryClient = new QueryClient();

document.title = i18n.t("adminAccess.documentTitle");

createRoot(container).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <BrowserApplication />
        </BrowserRouter>
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>,
);
