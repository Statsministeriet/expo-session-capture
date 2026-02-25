import { aggregateHeatmapPoints } from './aggregation'

interface BuildHeatmapTap {
  screen?: string
  normalizedX?: number
  normalizedY?: number
}

interface BuildHeatmapSession {
  appVersion?: string
  taps?: BuildHeatmapTap[]
}

interface BuildHeatmapParams {
  sessions: BuildHeatmapSession[]
  screen: string
  appVersion: string
}

export function buildHeatmap({
  sessions,
  screen,
  appVersion,
}: BuildHeatmapParams) {
  return aggregateHeatmapPoints(sessions, screen, appVersion)
}
