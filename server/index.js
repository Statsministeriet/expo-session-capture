const express = require('express')
const fs = require('fs')
const path = require('path')
const cors = require('cors')

const app = express()
app.use(cors())
app.use(express.json({ limit: '50mb' }))

const SESSIONS_DIR = path.join(__dirname, 'sessions')

if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR)
}

// ── Receive session batch from the app ───────────────────────────────

app.post('/session-upload', (req, res) => {
  const session = req.body

  if (!session || !session.sessionId) {
    return res.status(400).json({ error: 'Missing sessionId' })
  }

  const filePath = path.join(SESSIONS_DIR, `${session.sessionId}.json`)

  // Append frames if session file already exists (partial uploads)
  if (fs.existsSync(filePath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'))
      existing.frames = [...(existing.frames || []), ...(session.frames || [])]
      existing.taps = [...(existing.taps || []), ...(session.taps || [])]
      existing.scrolls = [...(existing.scrolls || []), ...(session.scrolls || [])]
      existing.deviceWidth = session.deviceWidth || existing.deviceWidth
      existing.deviceHeight = session.deviceHeight || existing.deviceHeight
      fs.writeFileSync(filePath, JSON.stringify(existing, null, 2))
    } catch {
      fs.writeFileSync(filePath, JSON.stringify(session, null, 2))
    }
  } else {
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2))
  }

  console.log(
    `[${new Date().toISOString()}] Saved session ${session.sessionId} — ${(session.frames || []).length} frames, ${(session.taps || []).length} taps, ${(session.scrolls || []).length} scrolls`
  )

  res.json({ ok: true })
})

// ── List all sessions ────────────────────────────────────────────────

app.get('/sessions', (req, res) => {
  const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.json'))

  const sessions = files.map(file => {
    const raw = fs.readFileSync(path.join(SESSIONS_DIR, file), 'utf-8')
    try {
      const data = JSON.parse(raw)
      return {
        id: data.sessionId || file.replace('.json', ''),
        device: data.device || '—',
        appVersion: data.appVersion || '—',
        userId: data.userId || '—',
        frameCount: (data.frames || []).length,
        tapCount: (data.taps || []).length,
        scrollCount: (data.scrolls || []).length,
      }
    } catch {
      return { id: file.replace('.json', ''), frameCount: 0 }
    }
  })

  res.json(sessions)
})

// ── Get single session ──────────────────────────────────────────────

app.get('/sessions/:id', (req, res) => {
  const filePath = path.join(SESSIONS_DIR, `${req.params.id}.json`)

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Not found' })
  }

  const data = fs.readFileSync(filePath, 'utf-8')
  res.json(JSON.parse(data))
})

// ── Start ────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 3001

app.listen(PORT, () => {
  console.log(`Session capture server running on http://localhost:${PORT}`)
})
