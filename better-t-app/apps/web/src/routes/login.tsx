import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Crosshair, Shield } from "lucide-react";
import { useState } from "react";

import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export const Route = createFileRoute("/login")({
  component: RouteComponent,
});

function RouteComponent() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <main className="w-full overflow-y-auto">
      <div className="mx-auto flex min-h-full max-w-6xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-16">
        <Link className="mb-6 inline-flex w-fit items-center gap-2 text-muted-foreground text-sm hover:text-foreground" to="/">
          <ArrowLeft aria-hidden="true" className="size-4" /> トップへ戻る
        </Link>
        <div className="grid overflow-hidden rounded-xl border bg-card shadow-sm lg:grid-cols-[0.9fr_1.1fr]">
          <section className="relative overflow-hidden border-b bg-primary/5 p-8 sm:p-10 lg:border-r lg:border-b-0">
            <div aria-hidden="true" className="pointer-events-none absolute -right-20 -bottom-24 size-72 rounded-full border border-primary/20" />
            <p className="font-semibold text-primary text-xs tracking-[0.25em]">PLANET BUSTERS</p>
            <h2 className="mt-6 font-bold text-3xl leading-tight tracking-tight">司令室へようこそ。</h2>
            <p className="mt-4 max-w-sm text-muted-foreground text-sm leading-relaxed">
              艦隊を指揮し、CPUとの戦いに挑みましょう。進行中の対局はいつでも司令室から再開できます。
            </p>
            <div className="mt-8 space-y-4 text-sm">
              <p className="flex items-center gap-3"><Crosshair aria-hidden="true" className="size-4 text-primary" />ターン制の戦略バトル</p>
              <p className="flex items-center gap-3"><Shield aria-hidden="true" className="size-4 text-primary" />主惑星を守り、敵を撃破</p>
            </div>
          </section>
          <section className="p-8 sm:p-10">
            <div className="mx-auto max-w-md">
              {showSignIn ? (
                <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
              ) : (
                <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
