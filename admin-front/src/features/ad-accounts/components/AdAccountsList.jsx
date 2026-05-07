export function AdAccountsList({ accounts, isLoading, isRefreshing, onRefresh, onDelete, isMutating }) {
  return (
    <section className="card">
      <div className="rules-header">
        <h2>Рекламные аккаунты</h2>
        <button type="button" onClick={onRefresh} className="button-secondary" disabled={isRefreshing}>
          {isRefreshing ? "Обновляем..." : "Обновить"}
        </button>
      </div>

      {isLoading ? <p>Загрузка...</p> : null}
      {!isLoading && accounts.length === 0 ? <p>Аккаунтов пока нет</p> : null}

      <div className="rules-list">
        {accounts.map((account) => (
          <article key={account.id} className="rule-item">
            <p>
              <strong>Платформа:</strong> {account.platform}
            </p>
            <p>
              <strong>Название:</strong> {account.name}
            </p>
            <p>
              <strong>Pixel ID:</strong> {account.pixelId}
            </p>
            <p>
              <strong>Access key:</strong> {account.accessKey}
            </p>
            <div className="actions">
              <button
                type="button"
                className="button-danger"
                onClick={() => onDelete(account.id)}
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
