import { createBrowserRouter } from "react-router-dom";
import { LoginPage } from "../pages/LoginPage";
import { RedirectRulesPage } from "../pages/RedirectRulesPage";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <RedirectRulesPage />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
]);
