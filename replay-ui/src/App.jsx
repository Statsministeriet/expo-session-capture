import { useEffect, useMemo, useState, useRef, useCallback } from 'react'
import { buildHeatmap } from './heatmap/HeatmapEngine'
import { HeatmapCanvas } from './heatmap/HeatmapCanvas'
import { HeatmapLegend } from './heatmap/HeatmapLegend.jsx'

const API = 'http://localhost:3001'
const REPLAY_WIDTH = 360
const TAP_FADE_MS = 600

export default function App() {
  const [mode, setMode] = useState('replay')
  const [sessions, setSessions] = useState([])
  const [heatmapSessions, setHeatmapSessions] = useState([])
  const [selectedScreen, setSelectedScreen] = useState('')
  const [selectedVersion, setSelectedVersion] = useState('')
  const [current, setCurrent] = useState(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [scrubbing, setScrubbing] = useState(false)
  const rafRef = useRef(null)

  // ── Load session list ──────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/sessions`)
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!sessions.length) {
      setHeatmapSessions([])
      return
    }

    let cancelled = false

    Promise.all(
      sessions.map((session) =>
        fetch(`${API}/sessions/${session.id}`)
          .then((response) => response.json())
          .catch(() => null),
      ),
    )
      .then((data) => {
        if (cancelled) return

        const filtered = data.filter(Boolean)
        setHeatmapSessions(filtered)
      })
      .catch(() => {
        if (cancelled) return
        setHeatmapSessions([])
      })

    return () => {
      cancelled = true
    }
  }, [sessions])

  const availableVersions = useMemo(() => {
    const versions = new Set()

    heatmapSessions.forEach((session) => {
      if (session?.appVersion) versions.add(session.appVersion)
    })

    return Array.from(versions)
  }, [heatmapSessions])

  const availableScreens = useMemo(() => {
    const screens = new Set()

    heatmapSessions.forEach((session) => {
      ;(session?.taps || []).forEach((tap) => {
        if (tap?.screen) screens.add(tap.screen)
      })
    })

    return Array.from(screens)
  }, [heatmapSessions])

  useEffect(() => {
    if (!availableVersions.length) {
      setSelectedVersion('')
      return
    }

    setSelectedVersion((prev) => (prev && availableVersions.includes(prev) ? prev : availableVersions[0]))
  }, [availableVersions])

  useEffect(() => {
    if (!availableScreens.length) {
      setSelectedScreen('')
      return
    }

    setSelectedScreen((prev) => (prev && availableScreens.includes(prev) ? prev : availableScreens[0]))
  }, [availableScreens])

  const heatmapPoints = useMemo(() => {
    if (!selectedScreen || !selectedVersion) return []

    return buildHeatmap({
      sessions: heatmapSessions,
      screen: selectedScreen,
      appVersion: selectedVersion,
    })
  }, [heatmapSessions, selectedScreen, selectedVersion])

  // ── Load a single session ─────────────────────────────────────────

  function loadSession(id) {
    fetch(`${API}/sessions/${id}`)
      .then(r => r.json())
      .then(data => {
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current)
          rafRef.current = null
        }
        setCurrent(data)
        setFrameIdx(0)
        setPlaying(false)
      })
  }

  // ── Playback using real timestamps ────────────────────────────────

  const stopPlayback = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPlaying(false)
  }, [])

  const play = useCallback(() => {
    if (!current || !current.frames?.length) return

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }

    setPlaying(true)

    const frames = current.frames
    const startIndex = frameIdx
    const baseTs = frames[startIndex].timestamp
    const startTime = performance.now()
    let i = startIndex
    let lastRendered = startIndex - 1

    function loop() {
      const elapsed = (performance.now() - startTime) * playbackRate

      while (i + 1 < frames.length && frames[i + 1].timestamp - baseTs <= elapsed) {
        i++
      }

      if (i !== lastRendered) {
        setFrameIdx(i)
        lastRendered = i
      }

      if (i < frames.length - 1) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        setFrameIdx(frames.length - 1)
        setPlaying(false)
        rafRef.current = null
      }
    }

    loop()
  }, [current, frameIdx, playbackRate])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  // ── Timeline ──────────────────────────────────────────────────────

  function findFrameIndexForTimestamp(frames, timestamp) {
    let low = 0
    let high = frames.length - 1

    while (low < high) {
      const mid = Math.floor((low + high) / 2)

      if (frames[mid].timestamp < timestamp) {
        low = mid + 1
      } else {
        high = mid
      }
    }

    const currentIdx = low
    const prevIdx = Math.max(0, currentIdx - 1)
    const currentDelta = Math.abs(frames[currentIdx].timestamp - timestamp)
    const prevDelta = Math.abs(frames[prevIdx].timestamp - timestamp)

    return prevDelta <= currentDelta ? prevIdx : currentIdx
  }

  function seekFromClientX(clientX, timelineElement) {
    if (!current?.frames?.length || !timelineElement) return

    const rect = timelineElement.getBoundingClientRect()
    const x = Math.min(rect.right, Math.max(rect.left, clientX))
    const ratio = rect.width > 0 ? (x - rect.left) / rect.width : 0
    const duration = sessionDurationMs || 1
    const targetTimestamp = current.frames[0].timestamp + ratio * duration
    const targetFrameIdx = findFrameIndexForTimestamp(current.frames, targetTimestamp)
    setFrameIdx(targetFrameIdx)
  }

  function handleTimelinePointerDown(e) {
    stopPlayback()
    setScrubbing(true)
    e.currentTarget.setPointerCapture(e.pointerId)
    seekFromClientX(e.clientX, e.currentTarget)
  }

  function handleTimelinePointerMove(e) {
    if (!scrubbing) return
    seekFromClientX(e.clientX, e.currentTarget)
  }

  function handleTimelinePointerUp(e) {
    if (!scrubbing) return
    seekFromClientX(e.clientX, e.currentTarget)
    e.currentTarget.releasePointerCapture(e.pointerId)
    setScrubbing(false)
  }

  function handleTogglePlay() {
    if (playing) {
      stopPlayback()
    } else {
      play()
    }
  }

  // ── Render ────────────────────────────────────────────────────────

  const frame = current?.frames?.[frameIdx]
  const baseTimestamp = current?.frames?.[0]?.timestamp ?? 0
  const sessionDurationMs = current?.frames?.length
    ? current.frames[current.frames.length - 1].timestamp - current.frames[0].timestamp
    : 0
  const currentOffsetMs = frame && current?.frames?.length
    ? frame.timestamp - baseTimestamp
    : 0
  const hasDeviceDimensions =
    Number(current?.deviceWidth) > 0 && Number(current?.deviceHeight) > 0
  const replayWidth = REPLAY_WIDTH
  const replayHeight = hasDeviceDimensions
    ? (replayWidth * current.deviceHeight) / current.deviceWidth
    : undefined
  const scaleX = hasDeviceDimensions ? replayWidth / current.deviceWidth : 1
  const scaleY = hasDeviceDimensions && replayHeight
    ? replayHeight / current.deviceHeight
    : 1
  const visibleTaps = hasDeviceDimensions
    ? (current?.taps || [])
    .filter(tap => {
      const tapOffsetMs = tap.timestamp - baseTimestamp
      return tapOffsetMs <= currentOffsetMs && currentOffsetMs - tapOffsetMs <= TAP_FADE_MS
    })
    .map(tap => {
      const tapOffsetMs = tap.timestamp - baseTimestamp
      const ageMs = currentOffsetMs - tapOffsetMs
      const opacity = Math.max(0, 1 - ageMs / TAP_FADE_MS)

      return {
        ...tap,
        opacity,
        scaledX: tap.x * scaleX,
        scaledY: tap.y * scaleY,
      }
    })
    : []
  const progressPct = sessionDurationMs > 0
    ? Math.min(100, Math.max(0, (currentOffsetMs / sessionDurationMs) * 100))
    : 0

  function formatMs(ms) {
    const totalSeconds = Math.max(0, Math.floor(ms / 1000))
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = String(totalSeconds % 60).padStart(2, '0')
    return `${minutes}:${seconds}`
  }

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.heading}>Sessions</h2>

        <div style={styles.modeWrap}>
          <button
            onClick={() => setMode('replay')}
            style={{
              ...styles.modeBtn,
              ...(mode === 'replay' ? styles.modeBtnActive : {}),
            }}
          >
            Replay
          </button>
          <button
            onClick={() => setMode('heatmap')}
            style={{
              ...styles.modeBtn,
              ...(mode === 'heatmap' ? styles.modeBtnActive : {}),
            }}
          >
            Heatmap
          </button>
        </div>

        {sessions.length === 0 && (
          <p style={styles.empty}>No sessions yet. Run the app to capture some.</p>
        )}

        {sessions.map(s => (
          <button
            key={s.id}
            onClick={() => loadSession(s.id)}
            style={{
              ...styles.sessionBtn,
              ...(current?.sessionId === s.id ? styles.sessionBtnActive : {}),
            }}
          >
            <div style={styles.sessionId}>{s.id.slice(0, 8)}…</div>
            <div style={styles.sessionMeta}>
              {s.device} · {s.frameCount} frames · {s.tapCount || 0} taps · {s.scrollCount || 0} scrolls
            </div>
          </button>
        ))}
      </div>

      <div style={styles.main}>
        {mode === 'heatmap' ? (
          <>
            <div style={styles.heatmapControls}>
              <label style={styles.heatmapSelectWrap}>
                Screen
                <select
                  value={selectedScreen}
                  onChange={(e) => setSelectedScreen(e.target.value)}
                  style={styles.heatmapSelect}
                >
                  {availableScreens.map((screen) => (
                    <option key={screen} value={screen}>
                      {screen}
                    </option>
                  ))}
                </select>
              </label>

              <label style={styles.heatmapSelectWrap}>
                Version
                <select
                  value={selectedVersion}
                  onChange={(e) => setSelectedVersion(e.target.value)}
                  style={styles.heatmapSelect}
                >
                  {availableVersions.map((version) => (
                    <option key={version} value={version}>
                      {version}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={styles.heatmapMeta}>
              <span><strong>Sessions:</strong> {heatmapSessions.length}</span>
              <span><strong>Points:</strong> {heatmapPoints.length}</span>
            </div>

            {!selectedScreen || !selectedVersion ? (
              <p style={styles.placeholder}>No heatmap data with screen/version yet.</p>
            ) : (
              <>
                <div style={styles.heatmapCanvasWrap}>
                  <HeatmapCanvas points={heatmapPoints} width={360} height={640} />
                </div>
                <HeatmapLegend pointsCount={heatmapPoints.length} />
              </>
            )}
          </>
        ) : !current ? (
          <p style={styles.placeholder}>← Select a session</p>
        ) : (
          <>
            <div style={styles.info}>
              <span><strong>Device:</strong> {current.device}</span>
              <span><strong>Version:</strong> {current.appVersion}</span>
              <span><strong>User:</strong> {current.userId}</span>
              <span><strong>Frames:</strong> {current.frames?.length}</span>
              <span><strong>Taps:</strong> {current.taps?.length || 0}</span>
              <span><strong>Scrolls:</strong> {current.scrolls?.length || 0}</span>
              <span><strong>Device Size:</strong> {current.deviceWidth || '—'} × {current.deviceHeight || '—'}</span>
              <span><strong>Duration:</strong> {formatMs(sessionDurationMs)}</span>
            </div>

            <div style={styles.controls}>
              <button
                onClick={handleTogglePlay}
                style={styles.playBtn}
              >
                {playing ? '⏸ Pause' : '▶ Play'}
              </button>

              <label style={styles.speedWrap}>
                Speed
                <select
                  value={playbackRate}
                  onChange={e => setPlaybackRate(Number(e.target.value))}
                  style={styles.speedSelect}
                >
                  <option value={0.5}>0.5x</option>
                  <option value={1}>1.0x</option>
                  <option value={1.5}>1.5x</option>
                  <option value={2}>2.0x</option>
                </select>
              </label>

              <div
                style={styles.timelineWrap}
                onPointerDown={handleTimelinePointerDown}
                onPointerMove={handleTimelinePointerMove}
                onPointerUp={handleTimelinePointerUp}
              >
                <div style={styles.timelineTrack}>
                  <div
                    style={{
                      ...styles.timelineProgress,
                      width: `${progressPct}%`,
                    }}
                  />
                  <div
                    style={{
                      ...styles.timelineThumb,
                      left: `calc(${progressPct}% - 7px)`,
                    }}
                  />
                </div>
              </div>

              <span style={styles.counter}>
                {frameIdx + 1} / {current.frames?.length || 0}
              </span>

              <span style={styles.timecode}>
                {formatMs(currentOffsetMs)} / {formatMs(sessionDurationMs)}
              </span>
            </div>

            <div style={styles.viewer}>
              {frame ? (
                <div
                  style={{
                    ...styles.frameStage,
                    width: replayWidth,
                    ...(hasDeviceDimensions ? { height: replayHeight } : {}),
                  }}
                >
                  <img
                    src={`data:image/jpeg;base64,${frame.image}`}
                    alt={`Frame ${frameIdx}`}
                    style={hasDeviceDimensions ? styles.frame : styles.frameWithoutDeviceDimensions}
                  />

                  {visibleTaps.map((tap, index) => (
                    <div
                      key={`${tap.timestamp}-${index}`}
                      style={{
                        ...styles.tapMarker,
                        left: tap.scaledX,
                        top: tap.scaledY,
                        opacity: tap.opacity,
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p>No frames</p>
              )}

              {frame && (
                <div style={styles.timestamp}>
                  {new Date(frame.timestamp).toLocaleTimeString()}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── Styles ──────────────────────────────────────────────────────────

const styles = {
  container: {
    display: 'flex',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#222',
    background: '#f5f5f5',
  },
  sidebar: {
    width: 280,
    background: '#fff',
    borderRight: '1px solid #e0e0e0',
    padding: 16,
    overflowY: 'auto',
  },
  heading: {
    margin: '0 0 12px',
    fontSize: 18,
  },
  empty: {
    color: '#999',
    fontSize: 13,
  },
  modeWrap: {
    display: 'flex',
    gap: 8,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    padding: '7px 10px',
    border: '1px solid #d0d0d0',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 600,
  },
  modeBtnActive: {
    background: '#e8f0fe',
    borderColor: '#4285f4',
    color: '#2458b8',
  },
  sessionBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '10px 12px',
    marginBottom: 6,
    border: '1px solid #e0e0e0',
    borderRadius: 6,
    background: '#fafafa',
    cursor: 'pointer',
    transition: 'background 0.15s',
  },
  sessionBtnActive: {
    background: '#e8f0fe',
    borderColor: '#4285f4',
  },
  sessionId: {
    fontFamily: 'monospace',
    fontSize: 13,
    fontWeight: 600,
  },
  sessionMeta: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: 24,
    overflowY: 'auto',
  },
  placeholder: {
    color: '#aaa',
    marginTop: 120,
    fontSize: 16,
  },
  info: {
    display: 'flex',
    gap: 20,
    fontSize: 13,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  heatmapControls: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  heatmapSelectWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontSize: 13,
    color: '#555',
  },
  heatmapSelect: {
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '6px 10px',
    fontSize: 13,
    background: '#fff',
    minWidth: 180,
  },
  heatmapMeta: {
    display: 'flex',
    gap: 20,
    marginBottom: 12,
    fontSize: 13,
  },
  heatmapCanvasWrap: {
    border: '1px solid #ddd',
    borderRadius: 8,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    background: '#fff',
  },
  playBtn: {
    padding: '8px 20px',
    fontSize: 14,
    border: '1px solid #ccc',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
  },
  timelineWrap: {
    width: 340,
    height: 24,
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    touchAction: 'none',
  },
  timelineTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    background: '#d9d9d9',
    position: 'relative',
    overflow: 'visible',
  },
  timelineProgress: {
    height: '100%',
    borderRadius: 999,
    background: '#4285f4',
  },
  timelineThumb: {
    position: 'absolute',
    top: -3,
    width: 14,
    height: 14,
    borderRadius: '50%',
    background: '#fff',
    border: '2px solid #4285f4',
    boxSizing: 'border-box',
  },
  counter: {
    fontFamily: 'monospace',
    fontSize: 13,
    minWidth: 60,
  },
  speedWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 12,
    color: '#555',
  },
  speedSelect: {
    border: '1px solid #ccc',
    borderRadius: 6,
    padding: '5px 8px',
    fontSize: 13,
    background: '#fff',
  },
  timecode: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    minWidth: 90,
  },
  viewer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  frameStage: {
    position: 'relative',
    border: '1px solid #ddd',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    background: '#fff',
  },
  frame: {
    width: '100%',
    height: '100%',
    display: 'block',
    objectFit: 'fill',
  },
  frameWithoutDeviceDimensions: {
    width: '100%',
    height: 'auto',
    display: 'block',
  },
  tapMarker: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: '50%',
    border: '2px solid #e53935',
    background: 'rgba(229, 57, 53, 0.25)',
    transform: 'translate(-50%, -50%)',
    pointerEvents: 'none',
  },
  timestamp: {
    marginTop: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#888',
  },
}
