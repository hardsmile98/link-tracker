import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "./app/store";
import { router } from "./app/router";
import "./index.css";
import "./App.css";
import "./features/auth/api/authApi";
import "./features/deposit-conversions/api/depositConversionsApi";
import "./features/redirect-rules/api/redirectRulesApi";
import "./features/telegram-trackers/api/telegramTrackersApi";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </StrictMode>,
);
