import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";
import {
  useGetTelegramTrackerChatsQuery,
  useGetTelegramTrackersQuery,
} from "../features/telegram-trackers/api/telegramTrackersApi";

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function formatPersonName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export function TelegramTrackerChatsPage() {
  const { trackerId } = useParams();
  const navigate = useNavigate();
  const [searchInput, setSearchInput] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQ(searchInput.trim()), 320);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const { data: meData, isLoading: isCheckingAuth } = useGetMeQuery();
  const authenticated = Boolean(meData?.authenticated);

  const { data: trackers = [] } = useGetTelegramTrackersQuery(undefined, { skip: !authenticated });
  const tracker = trackers.find((t) => t.id === trackerId);

  const {
    data: chats = [],
    isLoading: isChatsLoading,
    isFetching,
    error: chatsError,
  } = useGetTelegramTrackerChatsQuery(
    { trackerId, q: debouncedQ || undefined },
    { skip: !authenticated || !trackerId }
  );

  const [logout, { isLoading: isLogoutLoading, error: logoutError }] = useLogoutMutation();

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

  if (!trackerId) {
    return <Navigate to="/telegram-trackers" replace />;
  }

  const combinedError = chatsError?.data?.error ?? logoutError?.data?.error ?? "";

  return (
    <main className="container">
      <section className="card topbar">
        <h1>Чаты аккаунта</h1>
        <div className="actions">
          <Link to="/telegram-trackers" className="button button-link button-secondary">
            К трекерам
          </Link>
          <Link to="/" className="button button-link button-secondary">
            Редиректы
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
        <p>
          <strong>Аккаунт:</strong> {tracker?.label ?? trackerId}
        </p>
        <label className="chats-search">
          Поиск по тексту сообщения
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Введите фрагмент текста…"
            autoComplete="off"
          />
        </label>
        <p className="hint">
          Пустой поиск показывает все чаты. Если ввести текст, останутся только те чаты, где хотя бы одно
          сообщение содержит эту подстроку (без учёта регистра).
        </p>
      </section>

      <section className="card">
        <div className="rules-header">
          <h2>Список чатов</h2>
          {isFetching ? <span className="hint">Обновление…</span> : null}
        </div>

        {isChatsLoading ? <p>Загрузка...</p> : null}
        {!isChatsLoading && chats.length === 0 ? (
          <p>{debouncedQ ? "Нет чатов с таким текстом." : "Сообщений пока нет."}</p>
        ) : null}

        <div className="rules-list">
          {chats.map((c) => {
            const senderName = formatPersonName(
              c.last_message?.from_first_name,
              c.last_message?.from_last_name
            );
            const title =
              c.peer_type === "chat"
                ? senderName
                  ? `Чат ${c.peer_id} · ${senderName}`
                  : `Чат ${c.peer_id}`
                : senderName
                  ? `${senderName} · id ${c.peer_id}`
                  : `Личные сообщения · id ${c.peer_id}`;
            const body = c.last_message?.message_text?.trim() || "— без текста —";
            const preview = senderName ? `${senderName}: ${body}` : body;
            const when = formatWhen(c.last_message?.received_at);

            return (
              <Link
                key={`${c.peer_type}-${c.peer_id}`}
                to={`/telegram-trackers/${trackerId}/chats/${c.peer_type}/${c.peer_id}`}
                className="rule-item chat-row-link"
              >
                <p>
                  <strong>{title}</strong>
                </p>
                <p className="chat-preview">{preview}</p>
                <p className="message-meta">Последнее: {when}</p>
              </Link>
            );
          })}
        </div>
      </section>

      {combinedError ? <p className="error card">{combinedError}</p> : null}
    </main>
  );
}
