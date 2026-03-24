"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";

export default function DriverLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const result = await signIn("credentials", {
        email: form.email,
        password: form.password,
        redirect: false,
      });

      if (result?.error) {
        // Check if it's a pending approval or suspended issue
        if (result.error.includes("pending")) {
          setError(
            "Your driver account is pending admin approval. Please wait for confirmation.",
          );
        } else if (result.error.includes("suspended")) {
          setError(
            "Your driver account has been suspended. Please contact support.",
          );
        } else {
          setError("Invalid email or password. Please try again.");
        }
        return;
      }

      router.push("/driver");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Driver Sign In</h1>
          <p className="text-gray-500 mt-1">Access your driver dashboard</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            required
            autoComplete="email"
          />
          <Input
            label="Password"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            required
            autoComplete="current-password"
          />

          {error && <Alert variant="error">{error}</Alert>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Signing in…" : "Sign In"}
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have a driver account?{" "}
          <Link
            href="/driver/register"
            className="text-green-600 hover:underline font-medium"
          >
            Register
          </Link>
        </p>
      </Card>
    </div>
  );
}
