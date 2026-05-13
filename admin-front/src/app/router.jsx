import { createBrowserRouter } from "react-router-dom";
import { AdAccountsPage } from "../pages/AdAccountsPage";
import { DepositConversionsPage } from "../pages/DepositConversionsPage";
import { LoginPage } from "../pages/LoginPage";
import { RedirectRulesPage } from "../pages/RedirectRulesPage";
import { TelegramTrackerChatThreadPage } from "../pages/TelegramTrackerChatThreadPage";
import { TelegramTrackerChatsPage } from "../pages/TelegramTrackerChatsPage";
import { TelegramTrackersPage } from "../pages/TelegramTrackersPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RedirectRulesPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    path: "/ad-accounts",
    element: <AdAccountsPage />,
  },
  {
    path: "/deposit-conversions",
    element: <DepositConversionsPage />,
  },
  {
    path: "/telegram-trackers/:trackerId/chats/:peerType/:peerId",
    element: <TelegramTrackerChatThreadPage />,
  },
  {
    path: "/telegram-trackers/:trackerId/chats",
    element: <TelegramTrackerChatsPage />,
  },
  {
    path: "/telegram-trackers",
    element: <TelegramTrackersPage />,
  },
]);
