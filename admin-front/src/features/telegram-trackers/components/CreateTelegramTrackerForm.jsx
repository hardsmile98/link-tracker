import { useState } from "react";

export function CreateTelegramTrackerForm({
  onStartAuth,
  onVerifyCode,
  onVerifyPassword,
  isStarting,
  isVerifyingCode,
  isVerifyingPassword,
}) {
  const [label, setLabel] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [authSessionId, setAuthSessionId] = useState("");
  const [step, setStep] = useState("phone");

  async function handleStart(event) {
    event.preventDefault();

    const result = await onStartAuth({
      label: label.trim(),
      phone_number: phoneNumber.trim(),
    });

    setAuthSessionId(result.auth_session_id);
    setCode("");
    setPassword("");
    setStep("code");
  }

  async function handleCodeSubmit(event) {
    event.preventDefault();

    const result = await onVerifyCode({
      auth_session_id: authSessionId,
      code: code.trim(),
    });

    if (result?.next_step === "password") {
      setStep("password");
      return;
    }

    resetForm();
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();

    await onVerifyPassword({
      auth_session_id: authSessionId,
      password: password.trim(),
    });

    resetForm();
  }

  function resetForm() {
    setLabel("");
    setPhoneNumber("");
    setCode("");
    setPassword("");
    setAuthSessionId("");
    setStep("phone");
  }

  return (
    <section className="card">
      <h2>Добавить Telegram аккаунт</h2>

      {step === "phone" ? (
        <form onSubmit={handleStart} className="form-grid">
          <label>
            Название аккаунта
            <input
              required
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Support account"
            />
          </label>

          <label>
            Номер телефона
            <input
              required
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+79990001122"
            />
          </label>
          <button type="submit" disabled={isStarting}>
            {isStarting ? "Отправляем код..." : "Запросить код"}
          </button>
        </form>
      ) : null}

      {step === "code" ? (
        <form onSubmit={handleCodeSubmit} className="form-grid">
          <p className="hint">Введите код, который Telegram отправил на аккаунт.</p>
          <label>
            Код подтверждения
            <input required value={code} onChange={(event) => setCode(event.target.value)} placeholder="12345" />
          </label>
          <button type="submit" disabled={isVerifyingCode}>
            {isVerifyingCode ? "Проверяем..." : "Подтвердить код"}
          </button>
        </form>
      ) : null}

      {step === "password" ? (
        <form onSubmit={handlePasswordSubmit} className="form-grid">
          <p className="hint">Для этого аккаунта включена двухфакторная защита.</p>
          <label>
            Пароль 2FA
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Пароль"
            />
          </label>
          <button type="submit" disabled={isVerifyingPassword}>
            {isVerifyingPassword ? "Проверяем..." : "Подтвердить пароль"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
