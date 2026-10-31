import { Input } from "@better-t-app/ui/components/input";
import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";

export function PasswordInput(props: Omit<ComponentProps<typeof Input>, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input {...props} className="h-11 rounded-md pr-12 text-sm md:text-sm" type={visible ? "text" : "password"} />
      <button
        aria-label={visible ? "パスワードを隠す" : "パスワードを表示する"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-[-2px]"
        onClick={() => setVisible((current) => !current)}
        type="button"
      >
        {visible ? <EyeOff aria-hidden="true" className="size-4" /> : <Eye aria-hidden="true" className="size-4" />}
      </button>
    </div>
  );
}