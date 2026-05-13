import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useGetDepositConversionsQuery } from "../features/deposit-conversions/api/depositConversionsApi";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";

export function DepositConversionsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userFilterRaw = searchParams.get("user");
  const userFilter =
    userFilterRaw && /^\d+$/.test(userFilterRaw) ? userFilterRaw : undefined;

  const { data: meData, isLoading: isCheckingAuth } = useGetMeQuery();
  const authenticated = Boolean(meData?.authenticated);

  const {
    data: rows = [],
    isLoading,
    isFetching,
    refetch,
    error,
  } = useGetDepositConversionsQuery(
    { limit: 100, telegramUserId: userFilter },
    { skip: !authenticated }
  );
  const [logout, { isLoading: isLogoutLoading, error: logoutError }] = useLogoutMutation();

  const combinedError = error?.data?.error ?? logoutError?.data?.error ?? "";

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
        <h1>Депозиты (менеджер)</h1>
        <div className="actions">
          <Link to="/" className="button button-link button-secondary">
            Редиректы
          </Link>
          <Link to="/ad-accounts" className="button button-link button-secondary">
            Рекламные аккаунты
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

      <section className="card">
        <div className="rules-header">
          <h2>
            {userFilter ? `Депозиты пользователя ${userFilter}` : "История депозитов"}
          </h2>
          <div className="actions">
            {userFilter ? (
              <Link to="/deposit-conversions" className="button button-link button-secondary">
                Сбросить фильтр
              </Link>
            ) : null}
            <button
              type="button"
              className="button-secondary"
              onClick={() => void refetch()}
              disabled={isLoading || isFetching}
            >
              {isFetching ? "Обновляем..." : "Обновить"}
            </button>
          </div>
        </div>

        {isLoading ? <p>Загрузка...</p> : null}
        {!isLoading && rows.length === 0 ? (
          <p>
            {userFilter
              ? "У этого пользователя пока нет зафиксированных депозитов."
              : "Записей пока нет."}
          </p>
        ) : null}

        <div className="rules-list">
          {rows.map((row) => (
            <article key={row.id} className="rule-item">
              <p>
                <strong>Дата:</strong> {new Date(row.createdAt).toLocaleString()}
              </p>
              <p>
                <strong>Сумма USD:</strong> {row.amountUsd}
              </p>
              <p>
                <strong>Telegram ID:</strong> {row.telegramUserId}
              </p>
              <p>
                <strong>Click ID:</strong> {row.clickId ?? "—"}
              </p>
              <div className="actions">
                {row.chatThread ? (
                  <Link
                    to={`/telegram-trackers/${row.chatThread.trackerId}/chats/${row.chatThread.peerType}/${row.chatThread.peerId}?buyer=${row.telegramUserId}`}
                    className="button button-link button-secondary"
                  >
                    Чат с покупателем
                  </Link>
                ) : (
                  <span className="hint">Нет входящих от этого пользователя в трекерах</span>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {combinedError ? <p className="error card">{combinedError}</p> : null}
    </main>
  );
}
