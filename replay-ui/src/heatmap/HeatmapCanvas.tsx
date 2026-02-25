import { useEffect, useRef } from 'react'
import type { HeatmapPoint } from './aggregation'

interface HeatmapCanvasProps {
  points: HeatmapPoint[]
  width: number
  height: number
  style?: React.CSSProperties
}

export function HeatmapCanvas({ points, width, height, style }: HeatmapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, width, height)

    points.forEach((point) => {
      const x = point.x * width
      const y = point.y * height

      const gradient = ctx.createRadialGradient(x, y, 0, x, y, 40)
      gradient.addColorStop(0, 'rgba(255,0,0,0.4)')
      gradient.addColorStop(1, 'rgba(255,0,0,0)')

      ctx.fillStyle = gradient
      ctx.beginPath()
      ctx.arc(x, y, 40, 0, Math.PI * 2)
      ctx.fill()
    })
  }, [points, width, height])

  return <canvas ref={canvasRef} width={width} height={height} style={style} />
}
