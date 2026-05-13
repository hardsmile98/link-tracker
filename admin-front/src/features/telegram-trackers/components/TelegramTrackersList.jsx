import { Link } from "react-router-dom";

export function TelegramTrackersList({
  trackers,
  isLoading,
  isRefreshing,
  onRefresh,
  onDelete,
  onRestart,
  isMutating,
}) {
  return (
    <section className="card">
      <div className="rules-header">
        <h2>Отслеживаемые аккаунты</h2>
        <button type="button" onClick={onRefresh} className="button-secondary" disabled={isRefreshing}>
          {isRefreshing ? "Обновляем..." : "Обновить"}
        </button>
      </div>

      {isLoading ? <p>Загрузка...</p> : null}
      {!isLoading && trackers.length === 0 ? <p>Аккаунтов пока нет</p> : null}

      <div className="rules-list">
        {trackers.map((tracker) => (
          <article key={tracker.id} className="rule-item">
            <p>
              <strong>Название:</strong> {tracker.label}
            </p>
            <p>
              <strong>Статус:</strong> {tracker.isActive ? "Активен" : "Выключен"}
            </p>
            <p>
              <strong>Подключение:</strong> {tracker.isRunning ? "Online" : "Offline"}
            </p>
            <div className="actions">
              <Link
                to={`/telegram-trackers/${tracker.id}/chats`}
                className="button button-link button-secondary"
              >
                Перейти в чаты
              </Link>
              <button
                type="button"
                className="button-secondary"
                onClick={() => onRestart(tracker.id)}
                disabled={isMutating}>
                {isMutating ? "Перезапускаем..." : "Перезапустить"}
              </button>
              <button
                type="button"
                className="button-danger"
                onClick={() => onDelete(tracker.id)}
                disabled={isMutating}
              >
                {isMutating ? "Удаляем..." : "Удалить"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
