"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type ActionState } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/SubmitButton";

const initialState: ActionState = { error: null };
const inputClass =
  "mt-1 w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-heading focus:border-primary focus:outline-none";

export function SignupForm() {
  const [state, formAction] = useActionState(signup, initialState);

  return (
    <form action={formAction} className="w-full max-w-sm space-y-4 rounded-xl border border-border bg-surface p-8">
      <div>
        <h1 className="text-2xl font-bold text-heading">Create your account</h1>
        <p className="mt-1 text-sm text-body">New accounts need approval before they can see anything.</p>
      </div>

      {state.error && <p className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{state.error}</p>}

      <div>
        <label htmlFor="full_name" className="block text-sm font-medium text-body">
          Full name
        </label>
        <input id="full_name" name="full_name" type="text" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-body">
          Email
        </label>
        <input id="email" name="email" type="email" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-body">
          Password
        </label>
        <input id="password" name="password" type="password" required minLength={6} className={inputClass} />
      </div>

      <SubmitButton className="w-full" pendingText="Creating...">
        Create Account
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:text-primary-hover">
          Sign in
        </Link>
      </p>
    </form>
  );
}
