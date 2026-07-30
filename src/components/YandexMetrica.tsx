export default function YandexMetrica() {
  return null;
}

/** @deprecated Use the typed trackAnalyticsGoal helper for new events. */
export function reachMetricaGoal(goal: 'SELECT_PLAN' | 'CREATE_PHOTOSHOOT') {
  void goal;
}
