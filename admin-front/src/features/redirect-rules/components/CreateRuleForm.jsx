import { useState } from "react";

export function CreateRuleForm({ onCreate, isLoading, fallbackRule }) {
  const [createName, setCreateName] = useState("");
  const [createReferrer, setCreateReferrer] = useState("");
  const [createRedirectUrl, setCreateRedirectUrl] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();

    await onCreate({
      name: createName.trim(),
      referrer: createReferrer.trim() === "" ? null : createReferrer.trim(),
      redirect_url: createRedirectUrl.trim(),
    });

    setCreateName("");
    setCreateReferrer("");
    setCreateRedirectUrl("");
  }

  return (
    <section className="card">
      <h2>Добавить правило</h2>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Название
          <input
            required
            value={createName}
            onChange={(event) => setCreateName(event.target.value)}
            placeholder="Facebook — основной"
          />
        </label>
        <label>
          Referrer (пусто = fallback)
          <input
            value={createReferrer}
            onChange={(event) => setCreateReferrer(event.target.value)}
            placeholder="https://example.com/"
          />
        </label>
        <label>
          Redirect URL
          <input
            required
            type="url"
            value={createRedirectUrl}
            onChange={(event) => setCreateRedirectUrl(event.target.value)}
            placeholder="https://t.me/..."
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Создаем..." : "Создать"}
        </button>
      </form>
      {fallbackRule ? <p className="hint">Fallback: {fallbackRule.redirectUrl}</p> : null}
    </section>
  );
}
