/**
 * Статус GitHub через официальный Statuspage API (не зависит от api.github.com).
 * @returns {Promise<{ reachable: boolean, indicator: string, description: string, descriptionRu: string }>}
 */
async function fetchGitHubStatus() {
  const fallback = {
    reachable: false,
    indicator: "unknown",
    description: "Unable to reach GitHub Status",
    descriptionRu: "Не удалось получить статус GitHub",
  };

  try {
    const res = await fetch("https://www.githubstatus.com/api/v2/status.json", {
      signal: AbortSignal.timeout(6000),
      headers: { Accept: "application/json", "User-Agent": "Eva-style-updater" },
    });
    if (!res.ok) {
      return { ...fallback, description: `HTTP ${res.status}`, descriptionRu: `Ошибка ответа статуса (${res.status})` };
    }
    const data = await res.json();
    const indicator = typeof data?.status?.indicator === "string" ? data.status.indicator : "unknown";
    const description =
      typeof data?.status?.description === "string" ? data.status.description : "Unknown";
    return {
      reachable: true,
      indicator,
      description,
      descriptionRu: translateGitHubStatus(indicator, description),
    };
  } catch {
    return fallback;
  }
}

function translateGitHubStatus(indicator, englishDescription) {
  switch (indicator) {
    case "none":
      return "GitHub: всё работает";
    case "minor":
      return "GitHub: незначительные сбои";
    case "major":
      return "GitHub: серьёзные сбои";
    case "critical":
      return "GitHub: критический сбой";
    default:
      return englishDescription
        ? `GitHub: ${englishDescription}`
        : "GitHub: статус неизвестен";
  }
}

module.exports = { fetchGitHubStatus, translateGitHubStatus };
