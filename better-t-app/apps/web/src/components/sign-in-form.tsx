import { Button } from "@better-t-app/ui/components/button";
import { Input } from "@better-t-app/ui/components/input";
import { Label } from "@better-t-app/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { signInSchema } from "@/lib/auth-validation";
import { PasswordInput } from "./password-input";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: { email: "", password: "" },
    validators: { onSubmit: signInSchema },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(value, {
        onSuccess: () => {
          void navigate({ to: "/dashboard" });
          toast.success("ログインしました。");
        },
        onError: () => {
          toast.error("ログインできませんでした。入力内容や通信環境を確認してください。");
        },
      });
    },
  });

  return (
    <>
      <div className="space-y-2">
        <p className="font-semibold text-primary text-xs tracking-[0.2em]">WELCOME BACK</p>
        <h1 className="font-bold text-2xl tracking-tight">ログイン</h1>
        <p className="text-muted-foreground text-sm">司令室に戻り、対局を始めましょう。</p>
      </div>
      <form className="mt-8 space-y-5" noValidate onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
        <form.Field name="email">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>メールアドレス</Label>
              <Input aria-describedby={field.state.meta.errors.length ? "email-error" : undefined} aria-invalid={field.state.meta.errors.length > 0} autoComplete="email" className="h-11 rounded-md text-sm md:text-sm" id={field.name} name={field.name} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} type="email" value={field.state.value} />
              {field.state.meta.errors.map((error) => <p className="text-destructive text-xs" id="email-error" key={error?.message}>{error?.message}</p>)}
            </div>
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>パスワード</Label>
              <PasswordInput aria-describedby={field.state.meta.errors.length ? "password-error" : undefined} aria-invalid={field.state.meta.errors.length > 0} autoComplete="current-password" id={field.name} name={field.name} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} />
              {field.state.meta.errors.map((error) => <p className="text-destructive text-xs" id="password-error" key={error?.message}>{error?.message}</p>)}
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
          {({ canSubmit, isSubmitting }) => <Button className="h-11 w-full rounded-md text-sm" disabled={!canSubmit || isSubmitting} type="submit">{isSubmitting ? "ログイン中…" : "ログイン"}</Button>}
        </form.Subscribe>
      </form>
      <div className="mt-6 border-t pt-5 text-center text-muted-foreground text-sm">
        アカウントをお持ちでない方は <Button className="text-primary" onClick={onSwitchToSignUp} type="button" variant="link">新規登録</Button>
      </div>
    </>
  );
}