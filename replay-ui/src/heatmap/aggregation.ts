export interface HeatmapPoint {
  x: number
  y: number
}

interface HeatmapTap {
  screen?: string
  x?: number
  y?: number
  normalizedX?: number
  normalizedY?: number
}

interface HeatmapSession {
  appVersion?: string
  taps?: HeatmapTap[]
}

interface AggregateHeatmapOptions {
  normalizationWidth?: number
  normalizationHeight?: number
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function aggregateHeatmapPoints(
  sessions: HeatmapSession[],
  screen: string,
  appVersion: string,
  options: AggregateHeatmapOptions = {},
): HeatmapPoint[] {
  const normalizationWidth =
    typeof options.normalizationWidth === 'number' && options.normalizationWidth > 0
      ? options.normalizationWidth
      : undefined
  const normalizationHeight =
    typeof options.normalizationHeight === 'number' && options.normalizationHeight > 0
      ? options.normalizationHeight
      : undefined

  const points: HeatmapPoint[] = []

  sessions.forEach((session) => {
    if (session.appVersion !== appVersion) return

    ;(session.taps || [])
      .filter((tap) => tap.screen === screen)
      .forEach((tap) => {
        if (typeof tap.normalizedX === 'number' && typeof tap.normalizedY === 'number') {
          points.push({
            x: clamp01(tap.normalizedX),
            y: clamp01(tap.normalizedY),
          })
          return
        }

        if (
          typeof tap.x === 'number' &&
          typeof tap.y === 'number' &&
          normalizationWidth &&
          normalizationHeight
        ) {
          points.push({
            x: clamp01(tap.x / normalizationWidth),
            y: clamp01(tap.y / normalizationHeight),
          })
        }
      })
  })

  return points
}
