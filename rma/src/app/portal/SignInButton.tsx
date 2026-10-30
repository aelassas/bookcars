"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";

export default function SignInButton() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubmitting(true);
    await signIn("email", { email, callbackUrl: "/portal" });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 w-full max-w-sm rounded-card border border-line bg-surface p-6 shadow-card"
    >
      <Label htmlFor="portal-email">Email</Label>
      <Input
        id="portal-email"
        type="email"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full"
        placeholder="your@email.com"
      />
      <Button type="submit" disabled={submitting || !email.trim()} className="mt-4 w-full">
        {submitting ? "Sending…" : "Send magic link"}
      </Button>
    </form>
  );
}
