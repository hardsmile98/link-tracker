import { Link, Navigate, useNavigate } from "react-router-dom";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";
import {
  useDeleteTelegramTrackerMutation,
  useGetTelegramTrackersQuery,
  useRestartTelegramTrackerMutation,
  useStartTelegramTrackerAuthMutation,
  useVerifyTelegramTrackerCodeMutation,
  useVerifyTelegramTrackerPasswordMutation,
} from "../features/telegram-trackers/api/telegramTrackersApi";
import { CreateTelegramTrackerForm } from "../features/telegram-trackers/components/CreateTelegramTrackerForm";
import { TelegramTrackersList } from "../features/telegram-trackers/components/TelegramTrackersList";

export function TelegramTrackersPage() {
  const navigate = useNavigate();
  const { data: meData, isLoading: isCheckingAuth } = useGetMeQuery();
  const authenticated = Boolean(meData?.authenticated);

  const {
    data: trackers = [],
    isLoading: isTrackersLoading,
    isFetching: isTrackersFetching,
    refetch,
    error: trackersError,
  } = useGetTelegramTrackersQuery(undefined, { skip: !authenticated });

  const [startTrackerAuth, { isLoading: isStarting, error: startError }] = useStartTelegramTrackerAuthMutation();
  const [verifyCode, { isLoading: isVerifyingCode, error: codeError }] = useVerifyTelegramTrackerCodeMutation();
  const [verifyPassword, { isLoading: isVerifyingPassword, error: passwordError }] =
    useVerifyTelegramTrackerPasswordMutation();
  const [deleteTracker, { isLoading: isDeleting, error: deleteError }] = useDeleteTelegramTrackerMutation();
  const [restartTracker, { isLoading: isRestarting, error: restartError }] = useRestartTelegramTrackerMutation();
  const [logout, { isLoading: isLogoutLoading, error: logoutError }] = useLogoutMutation();

  const combinedError =
    trackersError?.data?.error ??
    startError?.data?.error ??
    codeError?.data?.error ??
    passwordError?.data?.error ??
    restartError?.data?.error ??
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
        <h1>Telegram трекеры</h1>
        <div className="actions">
          <Link to="/" className="button button-link button-secondary">
            Редиректы
          </Link>
          <Link to="/ad-accounts" className="button button-link button-secondary">
            Рекламные аккаунты
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

      <CreateTelegramTrackerForm
        onStartAuth={(payload) => startTrackerAuth(payload).unwrap().then((res) => res.data)}
        onVerifyCode={(payload) => verifyCode(payload).unwrap().then((res) => res.data)}
        onVerifyPassword={(payload) => verifyPassword(payload).unwrap().then((res) => res.data)}
        isStarting={isStarting}
        isVerifyingCode={isVerifyingCode}
        isVerifyingPassword={isVerifyingPassword}
      />

      <TelegramTrackersList
        trackers={trackers}
        isLoading={isTrackersLoading}
        isRefreshing={isTrackersFetching}
        onRefresh={() => void refetch()}
        onRestart={(id) => restartTracker(id).unwrap()}
        onDelete={(id) => deleteTracker(id).unwrap()}
        isMutating={isStarting || isVerifyingCode || isVerifyingPassword || isRestarting || isDeleting}
      />

      {combinedError ? <p className="error card">{combinedError}</p> : null}
    </main>
  );
}
