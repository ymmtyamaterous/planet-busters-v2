import { Link } from "@tanstack/react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
  return (
    <header className="border-b">
      <div className="mx-auto flex min-h-16 max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <nav aria-label="メインナビゲーション" className="flex items-center gap-4 sm:gap-8">
          <Link className="font-bold text-sm tracking-wider" to="/">
            PLANET BUSTERS
          </Link>
          <Link className="text-muted-foreground text-sm hover:text-foreground" to="/dashboard">
            司令室
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
