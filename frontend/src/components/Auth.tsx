import { useState } from "react";
import { ArrowRight, Mail, KeyRound } from "lucide-react";
import { Modal } from "./Modal";
import { api } from "../lib/api";
import type { UserView } from "../lib/types";
export function Auth({
  onClose,
  onLogin,
}: {
  onClose: () => void;
  onLogin: (u: UserView) => void;
}) {
  const [mode, setMode] = useState<
    "login" | "signup" | "verify" | "forgot" | "reset"
  >("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const titles = {
    login: "Welcome back, adventurer.",
    signup: "Your story begins here.",
    verify: "A message from the archive.",
    forgot: "Find your way back.",
    reset: "A new key to the archive.",
  };
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (mode === "login" || mode === "verify") {
        const r = await api<{ user: UserView }>(
          `/auth/${mode}`,
          "POST",
          mode === "login" ? { email, password } : { email, code },
        );
        onLogin(r.user);
        onClose();
      } else if (mode === "signup") {
        await api("/auth/signup", "POST", { email, password, username });
        setMode("verify");
        setMessage("Check your email for a six-digit verification code.");
      } else if (mode === "forgot") {
        await api("/auth/forgot-password", "POST", { email });
        setMode("reset");
        setMessage("If the account is eligible, a reset code has been sent.");
      } else {
        await api("/auth/reset-password", "POST", { email, code, password });
        setMode("login");
        setMessage("Password reset. Sign in with your new password.");
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unable to connect.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title={titles[mode]} onClose={onClose}>
      <p className="muted">
        Keep your characters, discoveries, and next great adventure in one
        place.
      </p>
      <form onSubmit={submit} className="form-stack">
        {mode === "signup" && (
          <label>
            Adventurer name
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={2}
              maxLength={40}
              required
              autoComplete="username"
            />
          </label>
        )}
        <label>
          <Mail size={14} /> Email address
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>
        {["login", "signup", "reset"].includes(mode) && (
          <label>
            <KeyRound size={14} /> Password
            <input
              type="password"
              minLength={mode === "login" ? 1 : 12}
              maxLength={72}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
            />
            {mode !== "login" && <small>At least 12 characters.</small>}
          </label>
        )}
        {["verify", "reset"].includes(mode) && (
          <label>
            Six-digit code
            <input
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoComplete="one-time-code"
            />
          </label>
        )}
        {message && (
          <p role="status" className="form-message">
            {message}
          </p>
        )}
        <button className="button primary" disabled={busy}>
          {busy
            ? "Opening the archive…"
            : mode === "login"
              ? "Enter the observatory"
              : mode === "signup"
                ? "Create account"
                : mode === "verify"
                  ? "Verify email"
                  : mode === "forgot"
                    ? "Send reset code"
                    : "Reset password"}
          <ArrowRight size={16} />
        </button>
      </form>
      <div className="auth-links">
        <button
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setMessage("");
          }}
        >
          {mode === "login"
            ? "New here? Create an account"
            : "Already have an account? Sign in"}
        </button>
        {mode === "login" && (
          <>
            <button onClick={() => setMode("forgot")}>Forgot password?</button>
            <button onClick={() => setMode("verify")}>Verify your email</button>
          </>
        )}
        {mode === "verify" && (
          <button
            onClick={async () => {
              try {
                await api("/auth/resend", "POST", { email });
                setMessage("If eligible, a fresh code is on its way.");
              } catch (e) {
                setMessage((e as Error).message);
              }
            }}
          >
            Send another code
          </button>
        )}
      </div>
    </Modal>
  );
}
