import { describe, expect, test } from "bun:test";
import { signInSchema, signUpSchema } from "./auth-validation";

describe("認証フォームのバリデーション", () => {
  const valid = { name: "司令官", email: "player@example.com", password: "password123", confirmPassword: "password123" };

  test("有効な登録情報を受け付ける", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  test("確認用パスワードの不一致を拒否する", () => {
    const result = signUpSchema.safeParse({ ...valid, confirmPassword: "other-password" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.some((issue) => issue.path[0] === "confirmPassword")).toBe(true);
  });

  test("空の確認用パスワード、短いパスワード、不正な名前とメールを拒否する", () => {
    expect(signUpSchema.safeParse({ ...valid, confirmPassword: "" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, email: "invalid" }).success).toBe(false);
  });

  test("ログイン時もメールとパスワードを検証する", () => {
    expect(signInSchema.safeParse({ email: valid.email, password: valid.password }).success).toBe(true);
    expect(signInSchema.safeParse({ email: "invalid", password: "short" }).success).toBe(false);
  });
});