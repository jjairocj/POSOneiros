"use client";

import { useEffect, useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginPage() {
  const router = useRouter();
  // useSession() fetches /api/auth/session, which always re-runs the jwt
  // callback (unlike the proxy's raw cookie decode), so this correctly
  // skips the redirect for a session that looks logged-in but was actually
  // invalidated (e.g. a password change) — that visitor sees the form and
  // has to log in again, instead of bouncing forever between here and /pos.
  const { data: session, status } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      router.replace(session.user.role === "ADMIN" ? "/admin" : "/pos");
    }
  }, [status, session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.error) {
      const err = res.error;
      if (err.startsWith("LOCKED:")) {
        setError(`Demasiados intentos fallidos. Espera ${err.split(":")[1]} minutos e intenta de nuevo.`);
      } else if (err.startsWith("ATTEMPTS:")) {
        setError(`Correo o contraseña incorrectos. Te quedan ${err.split(":")[1]} intentos antes de bloquear la cuenta.`);
      } else {
        setError("Correo o contraseña incorrectos.");
      }
      setLoading(false);
    } else {
      router.push("/pos");
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h1>Oneiros POS</h1>
          <p>Bienvenido. Inicia sesión para abrir tu turno.</p>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
              disabled={loading}
              className={styles.input}
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Contraseña</label>
            <div className={styles.passwordWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={loading}
                className={styles.input}
              />
              <button
                type="button"
                className={styles.togglePassword}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? "Ocultar" : "Mostrar"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={styles.submitBtn}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}
