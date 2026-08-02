import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Часы в шапке живут в отдельном компоненте,
 * чтобы таймер не перерисовывал всё приложение.
 */
export default function HeaderClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })
      );
      // Короткий формат — не раздувает шапку при крупном шрифте/масштабе
      setDateStr(
        now.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })
      );
    };
    updateTime();

    const msToNextMinute = 60_000 - (Date.now() % 60_000) + 50;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    const timeoutId = setTimeout(() => {
      updateTime();
      intervalId = setInterval(updateTime, 60_000);
    }, msToNextMinute);

    return () => {
      clearTimeout(timeoutId);
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  if (!timeStr) return null;

  return (
    <div
      className="inline-flex items-center gap-1.5 max-w-full bg-rose-50/50 border border-rose-100/70 text-slate-700 text-xs py-1 px-2 rounded font-mono font-bold leading-snug shrink min-w-0"
      id="header-clock-display"
      title={`${dateStr} ${timeStr}`}
    >
      <Clock className="h-3.5 w-3.5 text-rose-500 shrink-0" />
      <span className="whitespace-nowrap tabular-nums">
        {dateStr} {timeStr}
      </span>
    </div>
  );
}
