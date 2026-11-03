"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { TeamButton } from "@/components/team/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { loginSchema, type LoginValues } from "@/lib/validators/auth";
import { ApiClientError } from "@/lib/api-client";
import { routes } from "@/config/routes";
import { useAuth } from "@/providers/auth-provider";

const inputStyles =
  "border-line bg-paper focus-visible:border-ink focus-visible:ring-0 h-11 rounded-lg px-3 text-base";

export function LoginForm() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { identifier: "", password: "" },
  });

  async function onSubmit(values: LoginValues): Promise<void> {
    setSubmitting(true);
    try {
      const user = await login(values.identifier, values.password);
      toast.success(
        `Тавтай морил, ${user.username ?? user.name ?? user.email}!`,
      );
      const next = searchParams.get("next");
      const target =
        next && next.startsWith("/") && !next.startsWith("//")
          ? next
          : user.role === "ADMIN"
            ? routes.admin.dashboard
            : routes.user.dashboard;
      router.push(target);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : "Алдаа гарлаа. Дахин оролдоно уу.";
      toast.error(message);
      setSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    void form.handleSubmit(onSubmit)(event);
  }

  return (
    /* FormProvider — FormItem/FormLabel/FormControl read the form context
        (getFieldState); without it they crash at render. */
    <Form {...form}>
      <form onSubmit={handleSubmit} noValidate className="grid gap-5">
        <div className="mb-2">
          <h1 className="font-display text-ink text-[clamp(28px,3vw,36px)] leading-none font-bold tracking-[0.02em] uppercase">
            Нэвтрэх
          </h1>
          <p className="text-mute mt-2 text-sm">
            Өөрийн бүртгэлээр нэвтэрнэ үү.
          </p>
        </div>
        <FormField
          control={form.control}
          name="identifier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
                Нэвтрэх нэр
              </FormLabel>
              <FormControl>
                <Input
                  type="text"
                  autoComplete="username"
                  placeholder="Хэрэглэгчийн нэр"
                  className={inputStyles}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-mute text-[12px] font-semibold tracking-[0.12em] uppercase">
                Нууц үг
              </FormLabel>
              <FormControl>
                <Input
                  type="password"
                  autoComplete="current-password"
                  placeholder="Нууц үгээ оруулна уу"
                  className={inputStyles}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <TeamButton
          type="submit"
          variant="primary"
          className="mt-2 w-full disabled:pointer-events-none disabled:opacity-50"
          disabled={submitting}
        >
          {submitting && (
            <Loader2 className="animate-spin" aria-hidden="true" />
          )}
          {submitting ? "Нэвтэрч байна…" : "Нэвтрэх"}
        </TeamButton>
      </form>
    </Form>
  );
}
