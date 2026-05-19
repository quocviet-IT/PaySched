"use client";

import { useState, useTransition } from "react";

interface Props {
  action: (formData: FormData) => Promise<{ error: string } | void>;
  redirectedFrom: string;
  initialError?: string;
}

export function LoginForm({ action, redirectedFrom, initialError }: Props) {
  const [error, setError] = useState<string | undefined>(initialError);
  const [pending, startTransition] = useTransition();

  return (
    <form
      className="space-y-7"
      action={(formData) => {
        setError(undefined);
        startTransition(async () => {
          const result = await action(formData);
          if (result && "error" in result) setError(result.error);
        });
      }}
    >
      <input type="hidden" name="redirectedFrom" value={redirectedFrom} />

      <Field
        label="Username"
        name="username"
        type="text"
        autoComplete="username"
        autoFocus
      />

      <Field
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
      />

      {error && (
        <p className="text-xs text-hp-pink" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="
          w-full bg-hp-ink text-hp-foundation
          uppercase tracking-eyebrow text-xs font-body
          px-[22px] py-[14px] rounded-sm
          hover:bg-hp-pink transition-colors duration-150
          disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-hp-ink
        "
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}

interface FieldProps {
  label: string;
  name: string;
  type: "text" | "password" | "email";
  autoComplete: "username" | "current-password" | "email";
  autoFocus?: boolean;
}

function Field({ label, name, type, autoComplete, autoFocus }: FieldProps) {
  return (
    <div>
      <label
        htmlFor={name}
        className="block uppercase tracking-eyebrow text-[11px] text-hp-muted mb-2"
      >
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        required
        className="
          w-full bg-transparent
          border-0 border-b border-hp-rule
          px-0.5 py-1.5
          font-body text-base text-hp-body
          focus:outline-none focus:border-b-2 focus:border-hp-pink focus:pb-[5px]
          transition-colors duration-150
        "
      />
    </div>
  );
}
