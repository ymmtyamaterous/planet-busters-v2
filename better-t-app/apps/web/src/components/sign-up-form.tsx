import { Button } from "@better-t-app/ui/components/button";
import { Input } from "@better-t-app/ui/components/input";
import { Label } from "@better-t-app/ui/components/label";
import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";

import { authClient } from "@/lib/auth-client";
import { signUpSchema } from "@/lib/auth-validation";
import { PasswordInput } from "./password-input";

export default function SignUpForm({ onSwitchToSignIn }: { onSwitchToSignIn: () => void }) {
  const navigate = useNavigate();
  const form = useForm({
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
    validators: { onSubmit: signUpSchema },
    onSubmit: async ({ value }) => {
      await authClient.signUp.email({ name: value.name.trim(), email: value.email, password: value.password }, {
        onSuccess: () => {
          void navigate({ to: "/dashboard" });
          toast.success("アカウントを作成しました。");
        },
        onError: () => {
          toast.error("登録できませんでした。入力内容や通信環境を確認してください。");
        },
      });
    },
  });

  return (
    <>
      <div className="space-y-2">
        <p className="font-semibold text-primary text-xs tracking-[0.2em]">JOIN THE FLEET</p>
        <h1 className="font-bold text-2xl tracking-tight">アカウント登録</h1>
        <p className="text-muted-foreground text-sm">司令官として、最初の対局を始めましょう。</p>
      </div>
      <form className="mt-8 space-y-5" noValidate onSubmit={(event) => { event.preventDefault(); event.stopPropagation(); void form.handleSubmit(); }}>
        <form.Field name="name">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>名前</Label>
              <Input aria-describedby={field.state.meta.errors.length ? "name-error" : undefined} aria-invalid={field.state.meta.errors.length > 0} autoComplete="name" className="h-11 rounded-md text-sm md:text-sm" id={field.name} name={field.name} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} />
              {field.state.meta.errors.map((error) => <p className="text-destructive text-xs" id="name-error" key={error?.message}>{error?.message}</p>)}
            </div>
          )}
        </form.Field>
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
              <PasswordInput aria-describedby={field.state.meta.errors.length ? "password-help password-error" : "password-help"} aria-invalid={field.state.meta.errors.length > 0} autoComplete="new-password" id={field.name} name={field.name} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} />
              <p className="text-muted-foreground text-xs" id="password-help">8文字以上で入力してください。</p>
              {field.state.meta.errors.length > 0 && <div id="password-error">{field.state.meta.errors.map((error) => <p className="text-destructive text-xs" key={error?.message}>{error?.message}</p>)}</div>}
            </div>
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <div className="space-y-2">
              <Label htmlFor={field.name}>パスワード（確認）</Label>
              <PasswordInput aria-describedby={field.state.meta.errors.length ? "confirm-password-error" : undefined} aria-invalid={field.state.meta.errors.length > 0} autoComplete="new-password" id={field.name} name={field.name} onBlur={field.handleBlur} onChange={(event) => field.handleChange(event.target.value)} value={field.state.value} />
              {field.state.meta.errors.length > 0 && <div id="confirm-password-error">{field.state.meta.errors.map((error) => <p className="text-destructive text-xs" key={error?.message}>{error?.message}</p>)}</div>}
            </div>
          )}
        </form.Field>
        <form.Subscribe selector={(state) => ({ canSubmit: state.canSubmit, isSubmitting: state.isSubmitting })}>
          {({ canSubmit, isSubmitting }) => <Button className="h-11 w-full rounded-md text-sm" disabled={!canSubmit || isSubmitting} type="submit">{isSubmitting ? "登録中…" : "アカウントを作成"}</Button>}
        </form.Subscribe>
      </form>
      <div className="mt-6 border-t pt-5 text-center text-muted-foreground text-sm">
        すでにアカウントをお持ちの方は <Button className="text-primary" onClick={onSwitchToSignIn} type="button" variant="link">ログイン</Button>
      </div>
    </>
  );
}