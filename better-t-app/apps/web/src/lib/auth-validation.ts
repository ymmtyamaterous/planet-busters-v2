import { z } from "zod";

const email = z.email("有効なメールアドレスを入力してください。");
const password = z.string().min(8, "パスワードは8文字以上で入力してください。");

export const signInSchema = z.object({ email, password });

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "名前は2文字以上で入力してください。"),
    email,
    password,
    confirmPassword: z.string().min(1, "確認用パスワードを入力してください。"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "パスワードが一致しません。",
  });