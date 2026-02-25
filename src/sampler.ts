/**
 * Deterministic sampling based on userId.
 *
 * The same userId always maps to the same bucket, so a user is either
 * always sampled or never sampled within a given rate.  This avoids
 * inconsistent experiences across sessions.
 *
 * @param userId  Stable user identifier.
 * @param rate    Sampling rate 0–1  (e.g. 0.1 = 10 %).
 * @returns       `true` if the user should be captured.
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
