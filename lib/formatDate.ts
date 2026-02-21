/**
 * Format a date string for display (e.g. "2026-03-10" → "March 10, 2026").
 * If not parseable as ISO, returns the original string.
 */
export function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date/time for table display (e.g. "Mar 10, 2026, 3:45 PM").
 */
export function formatDateTime(dateStr: string | Date): string {
  const d = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  if (Number.isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Registration deadline countdown (e.g. "Closes in 2 days" or "Closes in 3h 45m 12s" or "Registration closed").
 * deadline: ISO date string or "YYYY-MM-DDTHH:mm" style.
 * When under 1 hour, includes minutes and seconds for realtime countdown.
 */
export function formatRegistrationCountdown(deadline: string): { text: string; closed: boolean } {
  const end = new Date(deadline);
  if (Number.isNaN(end.getTime())) return { text: "", closed: false };
  const now = new Date();
  if (now >= end) return { text: "Registration closed", closed: true };
  const ms = end.getTime() - now.getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
  const seconds = Math.floor((ms % (60 * 1000)) / 1000);
  if (days > 0) return { text: `Closes in ${days} day${days !== 1 ? "s" : ""}`, closed: false };
  if (hours > 0) return { text: `Closes in ${hours}h ${minutes}m ${seconds}s`, closed: false };
  if (minutes > 0) return { text: `Closes in ${minutes}m ${seconds}s`, closed: false };
  return { text: `Closes in ${seconds}s`, closed: false };
}
