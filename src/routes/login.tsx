import { createFileRoute, redirect, useNavigate, useRouter } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { fetchUserFn } from "~/lib/session-actions";
import { loginFn, registerFn } from "~/lib/auth-api";

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    // Already signed in, no reason to show the form.
    const { user } = await fetchUserFn();
    if (user) throw redirect({ to: "/" });
  },
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? ""),
      email: String(fd.get("email") ?? ""),
      password: String(fd.get("password") ?? ""),
    };

    const res =
      mode === "login" ? await loginFn({ data: payload }) : await registerFn({ data: payload });

    setPending(false);

    if ("error" in res && res.error) {
      setError(res.error);
      return;
    }

    /*
     * The signed-in user comes from the root route's loader, which is cached
     * from before the login. Invalidate it so the header swaps "Sign in" for
     * the account menu, then navigate within the app.
     */
    // Drop cached data from the previous identity before reloading the session.
    queryClient.removeQueries();
    await router.invalidate();
    await navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-sm">
      <Card>
        <CardHeader>
          <CardTitle>Sign in</CardTitle>
          <CardDescription>Track orders and check out faster.</CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as "login" | "register");
              setError(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Create account</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={onSubmit} className="mt-4 flex flex-col gap-4">
            {mode === "register" ? (
              <div className="grid gap-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" name="name" required autoComplete="name" />
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={mode === "register" ? 8 : undefined}
                autoComplete={mode === "register" ? "new-password" : "current-password"}
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}

            <Button type="submit" disabled={pending}>
              {pending ? "Please wait" : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
