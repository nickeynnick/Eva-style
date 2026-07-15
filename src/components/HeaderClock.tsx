import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

/**
 * Часы в шапке живут в отдельном компоненте,
 * чтобы setInterval(1s) не перерисовывал всё приложение.
 */
export default function HeaderClock() {
  const [timeStr, setTimeStr] = useState("");
  const [dateStr, setDateStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
      );
      setDateStr(
        now.toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!timeStr) return null;

  return (
    <div
      className="flex items-center gap-1.5 bg-rose-50/50 border border-rose-100/70 text-slate-700 text-xs py-1 px-2.5 rounded font-mono font-bold"
      id="header-clock-display"
    >
      <Clock className="h-3.5 w-3.5 text-rose-500" />
      <span>
        {dateStr} {timeStr}
      </span>
    </div>
  );
}
