import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useGetMeQuery, useLogoutMutation } from "../features/auth/api/authApi";
import {
  useCreateDepositConversionMutation,
  useGetDepositConversionsQuery,
} from "../features/deposit-conversions/api/depositConversionsApi";
import {
  useGetTelegramTrackerChatMessagesQuery,
  useGetTelegramTrackersQuery,
  useGetTelegramUserTrashStatusQuery,
  useMarkTelegramUserAsTrashMutation,
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
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositFormError, setDepositFormError] = useState("");

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
    { skip: !authenticated || !peerOk, pollingInterval: 30_000 }
  );

  const lastMsg = messages.length ? messages[messages.length - 1] : null;
  const buyerFromQuery = searchParams.get("buyer");
  const queryTelegramUserId =
    buyerFromQuery && /^\d+$/.test(buyerFromQuery) ? buyerFromQuery : null;
  const depositTelegramUserId =
    queryTelegramUserId ??
    (peerType === "user" ? peerId : lastMsg?.from_telegram_user_id ?? null);

  const {
    data: deposits = [],
    isLoading: isDepositsLoading,
    error: depositsError,
  } = useGetDepositConversionsQuery(
    { limit: 50, telegramUserId: depositTelegramUserId ?? undefined },
    { skip: !authenticated || !depositTelegramUserId }
  );

  const {
    data: trashStatus,
    isFetching: isTrashStatusFetching,
    error: trashStatusError,
  } = useGetTelegramUserTrashStatusQuery(
    { telegramUserId: depositTelegramUserId },
    { skip: !authenticated || !depositTelegramUserId }
  );

  const [
    createDepositConversion,
    { isLoading: isCreatingDeposit, error: createDepositError },
  ] = useCreateDepositConversionMutation();
  const [
    markTelegramUserAsTrash,
    { isLoading: isMarkingTrash, error: markTrashError },
  ] = useMarkTelegramUserAsTrashMutation();
  const [logout, { isLoading: isLogoutLoading, error: logoutError }] = useLogoutMutation();

  async function handleLogout() {
    await logout().unwrap();
    navigate("/login", { replace: true });
  }

  async function handleCreateDeposit(event) {
    event.preventDefault();
    setDepositFormError("");

    const amountUsd = Number(depositAmount.replace(",", "."));

    if (!depositTelegramUserId) {
      setDepositFormError("Не найден Telegram ID покупателя.");
      return;
    }

    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      setDepositFormError("Укажите сумму больше 0.");
      return;
    }

    try {
      await createDepositConversion({
        telegramUserId: depositTelegramUserId,
        amountUsd,
      }).unwrap();

      setDepositAmount("");
      setIsDepositModalOpen(false);
    } catch {
      // RTK Query exposes the request error through createDepositError.
    }
  }

  async function handleMarkTrash() {
    if (!depositTelegramUserId) {
      return;
    }

    const confirmed = window.confirm("Отправить trash в Keitaro и пометить покупателя в базе?");

    if (!confirmed) {
      return;
    }

    try {
      await markTelegramUserAsTrash({ telegramUserId: depositTelegramUserId }).unwrap();
    } catch {
      // RTK Query exposes the request error through markTrashError.
    }
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

  const lastSender = formatPersonName(lastMsg?.from_first_name, lastMsg?.from_last_name);
  const title =
    peerType === "chat"
      ? lastSender
        ? `Чат ${peerId} · ${lastSender}`
        : `Чат ${peerId}`
      : lastSender
        ? `${lastSender} · id ${peerId}`
        : `Личные сообщения · id ${peerId}`;
  const combinedError =
    messagesError?.data?.error ??
    depositsError?.data?.error ??
    createDepositError?.data?.error ??
    trashStatusError?.data?.error ??
    markTrashError?.data?.error ??
    logoutError?.data?.error ??
    "";

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
        <div className="chat-status-row">
          <p>
            <strong>Покупатель:</strong> {depositTelegramUserId ?? "не найден"}
          </p>
          {trashStatus?.is_trash ? (
            <span className="status-badge status-badge-danger">
              Trash{trashStatus.trash_marked_at ? ` · ${formatWhen(trashStatus.trash_marked_at)}` : ""}
            </span>
          ) : (
            <span className="status-badge">Не trash</span>
          )}
        </div>
        <div className="actions">
          <button
            type="button"
            className="button-danger"
            onClick={() => void handleMarkTrash()}
            disabled={!depositTelegramUserId || isMarkingTrash || trashStatus?.is_trash}
          >
            {isMarkingTrash ? "Отправляем..." : "Отправить как trash"}
          </button>
          {isTrashStatusFetching ? <span className="hint">Проверка статуса...</span> : null}
        </div>
      </section>

      {depositTelegramUserId && (
        <section className="card">
          <div className="rules-header">
            <h2>Депозиты пользователя {depositTelegramUserId}</h2>
            <div className="actions">
              <button type="button" onClick={() => setIsDepositModalOpen(true)}>
                Добавить депозит
              </button>
            </div>
          </div>
          {isDepositsLoading ? <p>Загрузка депозитов...</p> : null}
          {!isDepositsLoading && deposits.length === 0 ? (
            <p className="hint">Депозитов по этому Telegram ID пока нет.</p>
          ) : null}
          <div className="rules-list">
            {deposits.map((d) => (
              <article key={d.id} className="rule-item">
                <p>
                  <strong>Дата:</strong> {formatWhen(d.createdAt)}
                </p>
                <p>
                  <strong>Сумма USD:</strong> {d.amountUsd}
                </p>
                <p>
                  <strong>Click ID:</strong> {d.clickId ?? "—"}
                </p>
              </article>
            ))}
          </div>
        </section>
      )}

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

      {isDepositModalOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section className="card modal" role="dialog" aria-modal="true" aria-labelledby="deposit-title">
            <div className="rules-header">
              <h2 id="deposit-title">Добавить депозит</h2>
              <button
                type="button"
                className="button-secondary"
                onClick={() => setIsDepositModalOpen(false)}
                disabled={isCreatingDeposit}
              >
                Закрыть
              </button>
            </div>
            <form className="form-grid" onSubmit={(event) => void handleCreateDeposit(event)}>
              <p className="hint">Telegram ID: {depositTelegramUserId}</p>
              <label>
                Сумма USD
                <input
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={depositAmount}
                  onChange={(event) => setDepositAmount(event.target.value)}
                  autoFocus
                  required
                />
              </label>
              {depositFormError ? <p className="error">{depositFormError}</p> : null}
              <div className="actions">
                <button type="submit" disabled={isCreatingDeposit}>
                  {isCreatingDeposit ? "Отправляем..." : "Отправить"}
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => setIsDepositModalOpen(false)}
                  disabled={isCreatingDeposit}
                >
                  Отмена
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </main>
  );
}
