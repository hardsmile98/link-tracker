import { Link, Navigate, useNavigate } from "react-router-dom";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";
import {
  useCreateRedirectRuleMutation,
  useDeleteRedirectRuleMutation,
  useGetRedirectRulesQuery,
  useUpdateRedirectRuleMutation,
} from "../features/redirect-rules/api/redirectRulesApi";
import { CreateRuleForm } from "../features/redirect-rules/components/CreateRuleForm";
import { RedirectRulesList } from "../features/redirect-rules/components/RedirectRulesList";

export function RedirectRulesPage() {
  const navigate = useNavigate();
  const { data: meData, isLoading: isCheckingAuth } = useGetMeQuery();
  const authenticated = Boolean(meData?.authenticated);

  const {
    data: rules = [],
    isLoading: isRulesLoading,
    refetch,
    error: rulesError,
  } = useGetRedirectRulesQuery(undefined, {
    skip: !authenticated,
  });
  const [createRule, { isLoading: isCreating, error: createError }] = useCreateRedirectRuleMutation();
  const [updateRule, { isLoading: isUpdating, error: updateError }] = useUpdateRedirectRuleMutation();
  const [deleteRule, { isLoading: isDeleting, error: deleteError }] = useDeleteRedirectRuleMutation();
  const [logout, { isLoading: isLogoutLoading, error: logoutError }] = useLogoutMutation();

  const fallbackRule = rules.find((rule) => rule.referrer === null);
  const combinedError =
    rulesError?.data?.error ??
    createError?.data?.error ??
    updateError?.data?.error ??
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
        <h1>Админка редиректов</h1>
        <div className="actions">
          <Link to="/ad-accounts" className="button-link button-secondary">
            Рекламные аккаунты
          </Link>
          <button
            type="button"
            onClick={() => void handleLogout()}
            className="button-secondary"
            disabled={isLogoutLoading}
          >
            Выйти
          </button>
        </div>
      </section>

      <CreateRuleForm
        onCreate={(payload) => createRule(payload).unwrap()}
        isLoading={isCreating}
        fallbackRule={fallbackRule}
      />

      <RedirectRulesList
        rules={rules}
        isLoading={isRulesLoading}
        onRefresh={() => void refetch()}
        onUpdate={(payload) => updateRule(payload).unwrap()}
        onDelete={(id) => deleteRule(id).unwrap()}
        isMutating={isCreating || isUpdating || isDeleting}
      />

      {combinedError ? <p className="error card">{combinedError}</p> : null}
    </main>
  );
}
