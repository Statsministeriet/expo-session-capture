/**
 * Deterministic sampling based on `userId`.
 *
 * The same `userId` always maps to the same bucket, so a given user is
 * either **always** sampled or **never** sampled within a given rate.
 * This avoids inconsistent experiences across sessions and ensures
 * that session data for a sampled user is always complete.
 *
 * The implementation uses a simple but stable hash (sum of character
 * codes) to map the user ID to a value between 0 and 1.
 *
 * @param userId  Stable user identifier (anonymous or identified).
 * @param rate    Sampling rate `0` – `1`  (e.g. `0.1` = 10 %).
 * @returns       `true` if the user should be captured.
 *
 * @example
 * ```ts
 * shouldSample('user-42', 0.1);  // always returns the same boolean
 * shouldSample('user-42', 1.0);  // always true
 * shouldSample('user-42', 0);    // always false
 * ```
 */
export function shouldSample(userId: string, rate: number): boolean {
  if (rate <= 0) return false;
  if (rate >= 1) return true;

  // Simple but stable hash – sum of char codes.
  const hash = Array.from(userId).reduce(
    (acc, char) => acc + char.charCodeAt(0),
    0,
  );

  return (hash % 100) / 100 < rate;
}
