"use client";

import { useEffect, useState } from "react";
import { formatRegistrationCountdown } from "@/lib/formatDate";

type Props = {
  deadline: string | null | undefined;
  className?: string;
};

/**
 * Live countdown that updates every second until the registration deadline.
 * Shows "Registration closed" when past the deadline and stops ticking.
 */
export function RegistrationCountdown({ deadline, className = "" }: Props) {
  const [countdown, setCountdown] = useState(() =>
    deadline ? formatRegistrationCountdown(deadline) : { text: "", closed: false }
  );

  useEffect(() => {
    if (!deadline) {
      setCountdown({ text: "", closed: false });
      return undefined;
    }
    const update = () => setCountdown(formatRegistrationCountdown(deadline));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [deadline]);

  if (!countdown.text) return null;

  const resolvedClass =
    countdown.closed ? "text-amber-400 dark:text-amber-300" : (className || "text-emerald-400/90 dark:text-emerald-300");

  return (
    <span className={resolvedClass} aria-live="polite">
      {countdown.text}
    </span>
  );
}
