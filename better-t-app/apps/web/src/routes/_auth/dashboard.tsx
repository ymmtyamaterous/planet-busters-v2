import { Button } from "@better-t-app/ui/components/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Swords } from "lucide-react";
import { toast } from "sonner";

import { orpc } from "@/utils/orpc";

export const Route = createFileRoute("/_auth/dashboard")({
  component: RouteComponent,
});

function RouteComponent() {
  const { session } = Route.useRouteContext();
  const navigate = useNavigate();
  const activeMatches = useQuery(
    orpc.game.listMatches.queryOptions({ input: { status: "active" } }),
  );
  const completedMatches = useQuery(
    orpc.game.listMatches.queryOptions({ input: { status: "completed" } }),
  );
  const createMatch = useMutation(
    orpc.game.createCpuMatch.mutationOptions({
      onSuccess: (match) => {
        void navigate({ to: "/game/$matchId", params: { matchId: match.id } });
      },
      onError: (error) => toast.error(error.message),
    }),
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 overflow-y-auto px-4 py-8 sm:px-6">
      <header className="space-y-2">
        <p className="font-semibold text-primary text-xs tracking-[0.28em]">
          COMMAND CENTER
        </p>
        <h1 className="font-bold text-3xl tracking-tight sm:text-4xl">
          ようこそ、{session.data?.user.name}
        </h1>
        <p className="max-w-2xl text-muted-foreground">
          艦隊を指揮し、敵の主惑星を撃破してください。
        </p>
      </header>

      <section className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="font-semibold text-xl">CPU 戦を開始</h2>
            <p className="mt-1 text-muted-foreground text-sm">
              星雲の交差点で CPU 艦隊と対戦します。
            </p>
          </div>
          <Button
            aria-label="CPU 戦を開始"
            disabled={createMatch.isPending}
            onClick={() => createMatch.mutate({})}
            size="lg"
          >
            <Swords aria-hidden="true" />
            {createMatch.isPending ? "対局を準備中…" : "CPU 戦を開始"}
          </Button>
        </div>
      </section>

      <MatchList
        emptyMessage="進行中の対局はありません。"
        isLoading={activeMatches.isLoading}
        matches={activeMatches.data?.matches ?? []}
        title="進行中の対局を再開"
      />
      <MatchList
        emptyMessage="完了した対局はまだありません。"
        isLoading={completedMatches.isLoading}
        matches={completedMatches.data?.matches ?? []}
        title="対局履歴"
      />
    </main>
  );
}

type MatchListProps = {
  title: string;
  emptyMessage: string;
  isLoading: boolean;
  matches: readonly {
    id: string;
    status: "active" | "completed" | "abandoned";
    turnNumber: number;
    winnerSide: "human" | "cpu" | null;
    updatedAt: Date;
  }[];
};

function MatchList({ title, emptyMessage, isLoading, matches }: MatchListProps) {
  return (
    <section className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="font-semibold text-xl">{title}</h2>
      {isLoading ? (
        <p className="mt-4 text-muted-foreground text-sm">読み込み中…</p>
      ) : matches.length === 0 ? (
        <p className="mt-4 text-muted-foreground text-sm">{emptyMessage}</p>
      ) : (
        <ul className="mt-4 divide-y rounded-lg border">
          {matches.map((match) => (
            <li
              className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              key={match.id}
            >
              <div>
                <p className="font-medium">
                  {match.status === "active"
                    ? `第 ${match.turnNumber} ターン`
                    : match.winnerSide === "human"
                      ? "勝利"
                      : "敗北"}
                </p>
                <p className="text-muted-foreground text-xs">
                  最終更新: {match.updatedAt.toLocaleString("ja-JP")}
                </p>
              </div>
              <Link
                className="inline-flex h-8 items-center justify-center border bg-background px-2.5 font-medium text-xs hover:bg-muted"
                params={{ matchId: match.id }}
                to="/game/$matchId"
              >
                {match.status === "active" ? "対局を再開" : "結果を見る"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
