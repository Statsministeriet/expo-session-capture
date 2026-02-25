export function HeatmapLegend({ pointsCount }) {
  return (
    <div
      style={{
        width: 360,
        marginTop: 10,
        padding: '10px 12px',
        border: '1px solid #e0e0e0',
        borderRadius: 8,
        background: '#fff',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 8,
          fontSize: 12,
          color: '#666',
        }}
      >
        <span>Intensity</span>
        <span>{pointsCount} points</span>
      </div>

      <div
        style={{
          height: 10,
          borderRadius: 999,
          background:
            'linear-gradient(90deg, rgba(255,0,0,0.08) 0%, rgba(255,0,0,0.3) 50%, rgba(255,0,0,0.55) 100%)',
        }}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontSize: 11,
          color: '#7a7a7a',
        }}
      >
        <span>Low</span>
        <span>High</span>
      </div>
    </div>
  )
}
