import { aggregateHeatmapPoints } from './aggregation'

interface BuildHeatmapTap {
  screen?: string
  x?: number
  y?: number
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
  normalizationWidth?: number
  normalizationHeight?: number
}

export function buildHeatmap({
  sessions,
  screen,
  appVersion,
  normalizationWidth,
  normalizationHeight,
}: BuildHeatmapParams) {
  return aggregateHeatmapPoints(sessions, screen, appVersion, {
    normalizationWidth,
    normalizationHeight,
  })
}
