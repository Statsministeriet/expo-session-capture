export interface HeatmapPoint {
  x: number
  y: number
}

interface HeatmapTap {
  screen?: string
  normalizedX?: number
  normalizedY?: number
}

interface HeatmapSession {
  appVersion?: string
  taps?: HeatmapTap[]
}

export function aggregateHeatmapPoints(
  sessions: HeatmapSession[],
  screen: string,
  appVersion: string,
): HeatmapPoint[] {
  const points: HeatmapPoint[] = []

  sessions.forEach((session) => {
    if (session.appVersion !== appVersion) return

    ;(session.taps || [])
      .filter((tap) => tap.screen === screen)
      .forEach((tap) => {
        if (typeof tap.normalizedX !== 'number' || typeof tap.normalizedY !== 'number') {
          return
        }

        points.push({
          x: tap.normalizedX,
          y: tap.normalizedY,
        })
      })
  })

  return points
}
