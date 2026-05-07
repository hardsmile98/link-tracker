import { Link, Navigate, useNavigate } from "react-router-dom";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";
import {
  useCreateAdAccountMutation,
  useDeleteAdAccountMutation,
  useGetAdAccountsQuery,
} from "../features/ad-accounts/api/adAccountsApi";
import { AdAccountsList } from "../features/ad-accounts/components/AdAccountsList";
import { CreateAdAccountForm } from "../features/ad-accounts/components/CreateAdAccountForm";

export function AdAccountsPage() {
  const navigate = useNavigate();
  const { data: meData, isLoading: isCheckingAuth } = useGetMeQuery();
  const authenticated = Boolean(meData?.authenticated);

  const {
    data: accounts = [],
    isLoading: isAccountsLoading,
    isFetching: isAccountsFetching,
    refetch,
    error: accountsError,
  } = useGetAdAccountsQuery(undefined, {
    skip: !authenticated,
  });
  const [createAdAccount, { isLoading: isCreating, error: createError }] = useCreateAdAccountMutation();
  const [deleteAdAccount, { isLoading: isDeleting, error: deleteError }] = useDeleteAdAccountMutation();
  const [logout, { isLoading: isLogoutLoading, error: logoutError }] = useLogoutMutation();

  const combinedError =
    accountsError?.data?.error ??
    createError?.data?.error ??
    deleteError?.data?.error ??
    logoutError?.data?.error ??
    "";

  async function handleLogout() {
    await logout().unwrap();
    navigate("/login", { replace: true });
  }

  if (isCheckingAuth) {
    return <main className="container">Проверка сессии...</main>;
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <main className="container">
      <section className="card topbar">
        <h1>Админка рекламных аккаунтов</h1>
        <div className="actions">
          <Link to="/" className="button button-link button-secondary">
            Редиректы
          </Link>
          <Link to="/telegram-trackers" className="button button-link button-secondary">
            Telegram трекеры
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="button-secondary"
            disabled={isLogoutLoading}
          >
            {isLogoutLoading ? "Выходим..." : "Выйти"}
          </button>
        </div>
      </section>

      <CreateAdAccountForm
        onCreate={(payload) => createAdAccount(payload).unwrap()}
        isLoading={isCreating}
      />

      <AdAccountsList
        accounts={accounts}
        isLoading={isAccountsLoading}
        isRefreshing={isAccountsFetching}
        onRefresh={() => void refetch()}
        onDelete={(id) => deleteAdAccount(id).unwrap()}
        isMutating={isCreating || isDeleting}
      />

      {combinedError ? <p className="error card">{combinedError}</p> : null}
    </main>
  );
}
