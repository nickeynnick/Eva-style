/** Подтверждение опасного сброса: пользователь вводит слово СБРОС */
export function confirmResetAction(description: string): boolean {
  if (!window.confirm(description)) return false;
  const typed = window.prompt('Для подтверждения введите слово СБРОС (заглавными буквами):');
  return typed === "СБРОС";
}

export type ResetAppMode = "preserveTariffs" | "full";

export function getResetSuccessMessage(mode: ResetAppMode): string {
  if (mode === "preserveTariffs") {
    return "Операционные данные и настройки интерфейса сброшены. Тарифы, сотрудники и пароль владелицы сохранены.";
  }
  return "Выполнен полный сброс: все данные и тарифы восстановлены к заводским значениям. Пароль владелицы сохранён.";
}

/** Сразу записывает значение в localStorage (не ждёт useEffect) */
export function persistToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}
