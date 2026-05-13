import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";
import {
  useGetTelegramTrackerChatMessagesQuery,
  useGetTelegramTrackersQuery,
} from "../features/telegram-trackers/api/telegramTrackersApi";

const PEER_TYPES = new Set(["chat", "user"]);

function formatWhen(iso) {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(iso);
  }
}

function formatPersonName(firstName, lastName) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || null;
}

export function TelegramTrackerChatThreadPage() {
  const { trackerId, peerType, peerId } = useParams();
  const navigate = useNavigate();

  const { data: meData, isLoading: isCheckingAuth } = useGetMeQuery();
  const authenticated = Boolean(meData?.authenticated);

  const { data: trackers = [] } = useGetTelegramTrackersQuery(undefined, { skip: !authenticated });
  const tracker = trackers.find((t) => t.id === trackerId);

  const peerOk =
    Boolean(trackerId) &&
    Boolean(peerType) &&
    PEER_TYPES.has(peerType) &&
    Boolean(peerId) &&
    /^-?\d+$/.test(peerId);

  const {
    data: messages = [],
    isLoading,
    error: messagesError,
  } = useGetTelegramTrackerChatMessagesQuery(
    { trackerId, peerType, peerId },
    { skip: !authenticated || !peerOk }
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

  if (!peerOk) {
    return <Navigate to="/telegram-trackers" replace />;
  }

  const lastMsg = messages.length ? messages[messages.length - 1] : null;
  const lastSender = formatPersonName(lastMsg?.from_first_name, lastMsg?.from_last_name);
  const title =
    peerType === "chat"
      ? lastSender
        ? `Чат ${peerId} · ${lastSender}`
        : `Чат ${peerId}`
      : lastSender
        ? `${lastSender} · id ${peerId}`
        : `Личные сообщения · id ${peerId}`;
  const combinedError = messagesError?.data?.error ?? logoutError?.data?.error ?? "";

  return (
    <main className="container">
      <section className="card topbar">
        <h1>Сообщения</h1>
        <div className="actions">
          <Link
            to={`/telegram-trackers/${trackerId}/chats`}
            className="button button-link button-secondary"
          >
            К списку чатов
          </Link>
          <Link to="/telegram-trackers" className="button button-link button-secondary">
            К трекерам
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
        <p>
          <strong>Чат:</strong> {title}
        </p>
      </section>

      <section className="card">
        <h2>Переписка</h2>
        {isLoading ? <p>Загрузка...</p> : null}
        {!isLoading && messages.length === 0 ? <p>Сообщений нет.</p> : null}

        <div className="messages-thread">
          {messages.map((m) => {
            const sender = formatPersonName(m.from_first_name, m.from_last_name);
            const who = sender ? `${sender} (${m.from_telegram_user_id})` : m.from_telegram_user_id;
            return (
              <article key={m.id} className="message-item">
                <div className="message-meta">
                  {formatWhen(m.received_at)} · {who}
                  {m.telegram_message_id != null ? ` · tg #${m.telegram_message_id}` : null}
                </div>
                <div>{m.message_text?.trim() ? m.message_text : "— без текста —"}</div>
              </article>
            );
          })}
        </div>
      </section>

      {combinedError ? <p className="error card">{combinedError}</p> : null}
    </main>
  );
}
