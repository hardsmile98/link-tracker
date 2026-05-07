import { Navigate, useNavigate } from "react-router-dom";
import { LoginForm } from "../features/auth/components/LoginForm";
import { useGetMeQuery, useLoginMutation } from "../features/auth/api/authApi";

export function LoginPage() {
  const navigate = useNavigate();
  const { data, isLoading: isCheckingAuth } = useGetMeQuery();
  const [login, { isLoading: isLoginLoading, error }] = useLoginMutation();

  const authenticated = Boolean(data?.authenticated);

  async function handleLogin(credentials) {
    await login(credentials).unwrap();
    navigate("/", { replace: true });
  }

  if (isCheckingAuth) {
    return <main className="container">Проверка сессии...</main>;
  }

  if (authenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <main className="container">
      <LoginForm
        onSubmit={handleLogin}
        isLoading={isLoginLoading}
        errorMessage={error?.data?.error ?? ""}
      />
    </main>
  );
}
