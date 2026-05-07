import { useState } from "react";

export function RedirectRulesList({ rules, isLoading, onRefresh, onUpdate, onDelete, isMutating }) {
  const [editingRuleId, setEditingRuleId] = useState(null);
  const [editReferrer, setEditReferrer] = useState("");
  const [editRedirectUrl, setEditRedirectUrl] = useState("");

  function beginEdit(rule) {
    setEditingRuleId(rule.id);
    setEditReferrer(rule.referrer ?? "");
    setEditRedirectUrl(rule.redirectUrl);
  }

  async function handleSaveEdit(ruleId) {
    await onUpdate({
      id: ruleId,
      payload: {
        referrer: editReferrer.trim() === "" ? null : editReferrer.trim(),
        redirect_url: editRedirectUrl.trim(),
      },
    });
    setEditingRuleId(null);
  }

  return (
    <section className="card">
      <div className="rules-header">
        <h2>Правила</h2>
        <button type="button" onClick={onRefresh} className="button-secondary">
          Обновить
        </button>
      </div>

      {isLoading ? <p>Загрузка...</p> : null}
      {!isLoading && rules.length === 0 ? <p>Правил пока нет</p> : null}

      <div className="rules-list">
        {rules.map((rule) => (
          <article key={rule.id} className="rule-item">
            {editingRuleId === rule.id ? (
              <div className="form-grid">
                <label>
                  Referrer
                  <input
                    value={editReferrer}
                    onChange={(event) => setEditReferrer(event.target.value)}
                  />
                </label>
                <label>
                  Redirect URL
                  <input
                    type="url"
                    value={editRedirectUrl}
                    onChange={(event) => setEditRedirectUrl(event.target.value)}
                  />
                </label>
                <div className="actions">
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit(rule.id)}
                    disabled={isMutating}
                  >
                    Сохранить
                  </button>
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setEditingRuleId(null)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <>
                <p>
                  <strong>Referrer:</strong> {rule.referrer ?? "fallback"}
                </p>
                <p>
                  <strong>Redirect:</strong> {rule.redirectUrl}
                </p>
                <div className="actions">
                  <button type="button" onClick={() => beginEdit(rule)}>
                    Редактировать
                  </button>
                  <button
                    type="button"
                    className="button-danger"
                    onClick={() => onDelete(rule.id)}
                    disabled={isMutating}
                  >
                    Удалить
                  </button>
                </div>
              </>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
