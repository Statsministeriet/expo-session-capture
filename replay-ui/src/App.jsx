import { useEffect, useState, useRef, useCallback } from 'react'

const API = 'http://localhost:3001'

export default function App() {
  const [sessions, setSessions] = useState([])
  const [current, setCurrent] = useState(null)
  const [frameIdx, setFrameIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const rafRef = useRef(null)

  // ── Load session list ──────────────────────────────────────────────

  useEffect(() => {
    fetch(`${API}/sessions`)
      .then(r => r.json())
      .then(setSessions)
      .catch(() => {})
  }, [])

  // ── Load a single session ─────────────────────────────────────────

  function loadSession(id) {
    fetch(`${API}/sessions/${id}`)
      .then(r => r.json())
      .then(data => {
        setCurrent(data)
        setFrameIdx(0)
        setPlaying(false)
      })
  }

  // ── Playback using real timestamps ────────────────────────────────

  const play = useCallback(() => {
    if (!current || !current.frames?.length) return

    setPlaying(true)

    const frames = current.frames
    const baseTs = frames[0].timestamp
    const startTime = performance.now()
    let i = 0

    function loop() {
      const elapsed = performance.now() - startTime

      while (i < frames.length && frames[i].timestamp - baseTs <= elapsed) {
        setFrameIdx(i)
        i++
      }

      if (i < frames.length) {
        rafRef.current = requestAnimationFrame(loop)
      } else {
        setFrameIdx(frames.length - 1)
        setPlaying(false)
      }
    }

    loop()
  }, [current])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // ── Scrubber ──────────────────────────────────────────────────────

  function handleScrub(e) {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    setPlaying(false)
    setFrameIdx(Number(e.target.value))
  }

  // ── Render ────────────────────────────────────────────────────────

  const frame = current?.frames?.[frameIdx]

  return (
    <div style={styles.container}>
      <div style={styles.sidebar}>
        <h2 style={styles.heading}>Sessions</h2>

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
              {s.device} · {s.frameCount} frames
            </div>
          </button>
        ))}
      </div>

      <div style={styles.main}>
        {!current ? (
          <p style={styles.placeholder}>← Select a session</p>
        ) : (
          <>
            <div style={styles.info}>
              <span><strong>Device:</strong> {current.device}</span>
              <span><strong>Version:</strong> {current.appVersion}</span>
              <span><strong>User:</strong> {current.userId}</span>
              <span><strong>Frames:</strong> {current.frames?.length}</span>
            </div>

            <div style={styles.controls}>
              <button
                onClick={play}
                disabled={playing}
                style={styles.playBtn}
              >
                {playing ? '▶ Playing…' : '▶ Play'}
              </button>

              <input
                type="range"
                min={0}
                max={(current.frames?.length || 1) - 1}
                value={frameIdx}
                onChange={handleScrub}
                style={styles.scrubber}
              />

              <span style={styles.counter}>
                {frameIdx + 1} / {current.frames?.length || 0}
              </span>
            </div>

            <div style={styles.viewer}>
              {frame ? (
                <img
                  src={`data:image/jpeg;base64,${frame.image}`}
                  alt={`Frame ${frameIdx}`}
                  style={styles.frame}
                />
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
  playBtn: {
    padding: '8px 20px',
    fontSize: 14,
    border: '1px solid #ccc',
    borderRadius: 6,
    background: '#fff',
    cursor: 'pointer',
  },
  scrubber: {
    width: 300,
  },
  counter: {
    fontFamily: 'monospace',
    fontSize: 13,
    minWidth: 60,
  },
  viewer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  frame: {
    width: 360,
    border: '1px solid #ddd',
    borderRadius: 8,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  timestamp: {
    marginTop: 8,
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#888',
  },
}
