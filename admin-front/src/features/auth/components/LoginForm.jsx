import { useState } from "react";

export function LoginForm({ onSubmit, isLoading, errorMessage }) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  function handleSubmit(event) {
    event.preventDefault();
    onSubmit({ login, password });
  }

  return (
    <section className="card auth-card">
      <h1>Вход в админку</h1>
      <form onSubmit={handleSubmit} className="form-grid">
        <label>
          Логин
          <input value={login} onChange={(event) => setLogin(event.target.value)} />
        </label>
        <label>
          Пароль
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" disabled={isLoading}>
          {isLoading ? "Входим..." : "Войти"}
        </button>
      </form>
      {errorMessage ? <p className="error">{errorMessage}</p> : null}
    </section>
  );
}
