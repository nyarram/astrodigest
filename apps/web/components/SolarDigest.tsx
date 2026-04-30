'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import type {
  Digest,
  BigStory,
  QuickHit,
  ImageOfWeek,
  PaperDeepDive,
  SpaceNewsItem,
} from '@astrodigest/shared'

// ── Constants ────────────────────────────────────────────────────────────────

const SRC_COLOR: Record<string, string> = {
  nasa: '#60a5fa',
  spacex: '#34d399',
  eso: '#c084fc',
  alma: '#f472b6',
  arxiv: '#fb923c',
  nasaspaceflight: '#38bdf8',
  planetary: '#4ade80',
  spaceflightnow: '#34d399',
}

const SRC_LABEL: Record<string, string> = {
  nasa: 'NASA',
  spacex: 'SpaceX',
  eso: 'ESO',
  alma: 'ALMA',
  arxiv: 'arXiv',
  nasaspaceflight: 'NASASpaceFlight',
  planetary: 'Planetary',
  spaceflightnow: 'SpaceflightNow',
}

const MOON_ORBIT_R = 16

// ── Types ────────────────────────────────────────────────────────────────────

type BodyType = 'bigStory' | 'quickHit' | 'imageOfWeek' | 'paperDeepDive' | 'spaceNews'

type BodyData = BigStory | QuickHit | ImageOfWeek | PaperDeepDive | SpaceNewsItem[]

interface BodyDef {
  id: string
  type: BodyType | null
  data: BodyData | null
  idx?: number
  r: number
  orbit: number
  speed: number
  angle: number
  color: string
  glow: string
  name: string
  zoomZ: number
  rings?: boolean
}

interface HoverInfo {
  id: string
  label: string
  title: string
  color: string
  planetName: string
  x: number
  y: number
}

interface Star {
  x: number
  y: number
  r: number
  op: number
  phase: number
  spd: number
  depth: number
}

interface Asteroid {
  angle: number
  variance: number
  r: number
  op: number
  speed: number
}

interface ShootingStar {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  decay: number
  len: number
}

interface Camera {
  tx: number
  ty: number
  z: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function hexAlpha(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r},${g},${b},${a.toFixed(3)})`
}

function buildBodies(digest: Digest): BodyDef[] {
  const { bigStory, quickHits, imageOfWeek, paperDeepDive, spaceNews } = digest.sections
  return [
    {
      id: 'sun',
      type: 'bigStory',
      data: bigStory,
      r: 42,
      orbit: 0,
      speed: 0,
      angle: 0,
      color: '#fbbf24',
      glow: '#f59e0b',
      name: 'The Sun',
      zoomZ: 1.4,
    },
    {
      id: 'mercury',
      type: quickHits[0] ? 'quickHit' : null,
      data: quickHits[0] ?? null,
      idx: 0,
      r: 4,
      orbit: 66,
      speed: 8.0,
      angle: 20,
      color: '#94a3b8',
      glow: '#cbd5e1',
      name: 'Mercury',
      zoomZ: 2.8,
    },
    {
      id: 'venus',
      type: quickHits[1] ? 'quickHit' : null,
      data: quickHits[1] ?? null,
      idx: 1,
      r: 8,
      orbit: 92,
      speed: 3.2,
      angle: 140,
      color: '#fde68a',
      glow: '#fbbf24',
      name: 'Venus',
      zoomZ: 2.4,
    },
    {
      id: 'earth',
      type: quickHits[2] ? 'quickHit' : null,
      data: quickHits[2] ?? null,
      idx: 2,
      r: 9,
      orbit: 122,
      speed: 2.0,
      angle: 260,
      color: '#3b82f6',
      glow: '#60a5fa',
      name: 'Earth',
      zoomZ: 2.2,
    },
    {
      id: 'moon',
      type: imageOfWeek ? 'imageOfWeek' : null,
      data: imageOfWeek,
      r: 3,
      orbit: 0,
      speed: 0,
      angle: 80,
      color: '#e2e8f0',
      glow: '#94a3b8',
      name: 'The Moon',
      zoomZ: 2.2,
    },
    {
      id: 'mars',
      type: null,
      data: null,
      r: 6,
      orbit: 158,
      speed: 1.06,
      angle: 310,
      color: '#f87171',
      glow: '#fca5a5',
      name: 'Mars',
      zoomZ: 2.0,
    },
    {
      id: 'asteroids',
      type: spaceNews?.length ? 'spaceNews' : null,
      data: spaceNews ?? null,
      r: 0,
      orbit: 190,
      speed: 0,
      angle: 0,
      color: '#64748b',
      glow: '#94a3b8',
      name: 'Asteroid Belt',
      zoomZ: 1.5,
    },
    {
      id: 'jupiter',
      type: paperDeepDive ? 'paperDeepDive' : null,
      data: paperDeepDive,
      r: 22,
      orbit: 228,
      speed: 0.17,
      angle: 50,
      color: '#fb923c',
      glow: '#fbbf24',
      name: 'Jupiter',
      zoomZ: 1.6,
    },
    {
      id: 'saturn',
      type: null,
      data: null,
      r: 17,
      orbit: 268,
      speed: 0.068,
      angle: 160,
      color: '#fef3c7',
      glow: '#fde68a',
      name: 'Saturn',
      zoomZ: 1.5,
      rings: true,
    },
    {
      id: 'uranus',
      type: null,
      data: null,
      r: 11,
      orbit: 302,
      speed: 0.024,
      angle: 220,
      color: '#67e8f9',
      glow: '#38bdf8',
      name: 'Uranus',
      zoomZ: 1.4,
    },
    {
      id: 'neptune',
      type: null,
      data: null,
      r: 10,
      orbit: 334,
      speed: 0.012,
      angle: 290,
      color: '#818cf8',
      glow: '#a5b4fc',
      name: 'Neptune',
      zoomZ: 1.4,
    },
    {
      id: 'pluto',
      type: null,
      data: null,
      r: 3,
      orbit: 362,
      speed: 0.005,
      angle: 75,
      color: '#c4a882',
      glow: '#d4b896',
      name: 'Pluto',
      zoomZ: 1.3,
    },
  ]
}

function getInteractiveIds(bodies: BodyDef[]): Set<string> {
  return new Set(bodies.filter((b) => b.type !== null && b.data !== null).map((b) => b.id))
}

function typeLabel(type: BodyType | null): string {
  switch (type) {
    case 'bigStory':
      return 'Big Story'
    case 'quickHit':
      return 'Quick Hit'
    case 'imageOfWeek':
      return 'Image of the Week'
    case 'paperDeepDive':
      return 'Paper Deep Dive'
    case 'spaceNews':
      return 'Space News'
    default:
      return ''
  }
}

// ── Solar Canvas ─────────────────────────────────────────────────────────────

interface SolarCanvasProps {
  bodies: BodyDef[]
  onSelect: (body: BodyDef) => void
  selectedId: string | null
  userSpeed: number
}

function SolarCanvas({ bodies, onSelect, selectedId, userSpeed }: SolarCanvasProps): JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const angleRef = useRef<Record<string, number>>({})
  const moonLocalAngle = useRef(0)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const hoverIdRef = useRef<string | null>(null)
  const selectedIdRef = useRef(selectedId)
  const onSelectRef = useRef(onSelect)
  const userSpeedRef = useRef(userSpeed)
  const animRef = useRef<number>(0)
  const lastTRef = useRef<number | null>(null)
  const speedMultRef = useRef(1)

  const camRef = useRef<Camera>({ tx: 0, ty: 0, z: 1 })
  const camTargetRef = useRef<Camera>({ tx: 0, ty: 0, z: 1 })
  const pendingRef = useRef<BodyDef | null>(null)
  const zoomDelayRef = useRef(0)

  const parallaxRef = useRef({ x: 0, y: 0 })
  const trailsRef = useRef(new Map<string, Array<{ x: number; y: number }>>())
  const shootsRef = useRef<ShootingStar[]>([])
  const nextShootRef = useRef(1.5)
  const loadTRef = useRef(0)
  const starsRef = useRef<Star[]>([])
  const asteroidsRef = useRef<Asteroid[]>([])
  const bodiesRef = useRef(bodies)

  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null)

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])
  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])
  useEffect(() => {
    userSpeedRef.current = userSpeed
  }, [userSpeed])

  useEffect(() => {
    if (!selectedId) camTargetRef.current = { tx: 0, ty: 0, z: 1 }
  }, [selectedId])

  // One-time setup
  useEffect(() => {
    const stars: Star[] = []
    for (let i = 0; i < 320; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: Math.random() * 1.3 + 0.2,
        op: Math.random() * 0.55 + 0.15,
        phase: Math.random() * Math.PI * 2,
        spd: Math.random() * 0.016 + 0.004,
        depth: Math.random(),
      })
    }
    starsRef.current = stars

    const asts: Asteroid[] = []
    for (let i = 0; i < 36; i++) {
      asts.push({
        angle: (i / 36) * Math.PI * 2 + (Math.random() - 0.5) * 0.2,
        variance: (Math.random() - 0.5) * 22,
        r: Math.random() * 2.5 + 1.0,
        op: Math.random() * 0.45 + 0.25,
        speed: 0.35 + Math.random() * 0.12,
      })
    }
    asteroidsRef.current = asts

    bodiesRef.current.forEach((b) => {
      angleRef.current[b.id] = (b.angle * Math.PI) / 180
    })
    moonLocalAngle.current = (80 * Math.PI) / 180
  }, [])

  function getWorldPos(
    body: BodyDef,
    angles: Record<string, number>,
    moonAngle: number,
  ): { x: number; y: number } {
    if (body.id === 'moon') {
      const ea = angles['earth'] ?? 0
      return {
        x: 122 * Math.cos(ea) + MOON_ORBIT_R * Math.cos(moonAngle),
        y: 122 * Math.sin(ea) + MOON_ORBIT_R * Math.sin(moonAngle),
      }
    }
    if (body.orbit === 0) return { x: 0, y: 0 }
    const a = angles[body.id] ?? 0
    return { x: body.orbit * Math.cos(a), y: body.orbit * Math.sin(a) }
  }

  // Main animation loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const setSize = (): void => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    setSize()
    window.addEventListener('resize', setSize)

    function toCanvas(
      wx: number,
      wy: number,
      W: number,
      H: number,
      cam: Camera,
    ): { x: number; y: number } {
      return { x: (wx - cam.tx) * cam.z + W / 2, y: (wy - cam.ty) * cam.z + H / 2 }
    }
    function toWorld(
      cx: number,
      cy: number,
      W: number,
      H: number,
      cam: Camera,
    ): { x: number; y: number } {
      return { x: (cx - W / 2) / cam.z + cam.tx, y: (cy - H / 2) / cam.z + cam.ty }
    }
    function hitWorld(wmx: number, wmy: number, wx: number, wy: number, r: number): boolean {
      const dx = wmx - wx,
        dy = wmy - wy
      return dx * dx + dy * dy <= r * r
    }

    function frame(t: number): void {
      const dt = lastTRef.current ? Math.min((t - lastTRef.current) / 1000, 0.05) : 0.016
      lastTRef.current = t
      // canvas is guaranteed non-null — we return early above if it's null
      const c = canvas as HTMLCanvasElement
      const ctx = c.getContext('2d')!
      const W = c.width,
        H = c.height
      const mx = mouseRef.current.x,
        my = mouseRef.current.y
      const bods = bodiesRef.current
      const angles = angleRef.current
      const interactive = getInteractiveIds(bods)

      loadTRef.current = Math.min(loadTRef.current + dt / 2.2, 1)
      const loadE = 1 - Math.pow(1 - loadTRef.current, 3)

      parallaxRef.current.x += ((mx / W - 0.5) * 2 - parallaxRef.current.x) * 0.04
      parallaxRef.current.y += ((my / H - 0.5) * 2 - parallaxRef.current.y) * 0.04
      const px = parallaxRef.current.x,
        py = parallaxRef.current.y

      const isHovering = hoverIdRef.current !== null
      speedMultRef.current += ((isHovering ? 0 : 1) - speedMultRef.current) * 0.07
      const sm = speedMultRef.current * userSpeedRef.current * loadE

      bods.forEach((b) => {
        if (b.orbit > 0 && b.id !== 'asteroids' && b.id !== 'moon')
          angles[b.id] = (angles[b.id] ?? 0) + ((b.speed * Math.PI) / 180) * dt * sm
      })
      moonLocalAngle.current += ((18.0 * Math.PI) / 180) * dt * sm
      asteroidsRef.current.forEach((ast) => {
        ast.angle += ((ast.speed * Math.PI) / 180) * dt * sm
      })

      // Camera: follow selected body
      const selId = selectedIdRef.current
      if (selId && !pendingRef.current) {
        const selBody = bods.find((b) => b.id === selId)
        if (selBody) {
          const wp = getWorldPos(selBody, angles, moonLocalAngle.current)
          camTargetRef.current = { tx: wp.x, ty: wp.y, z: camTargetRef.current.z }
        }
      }
      if (pendingRef.current) {
        const pb = pendingRef.current
        const wp = getWorldPos(pb, angles, moonLocalAngle.current)
        camTargetRef.current = { tx: wp.x, ty: wp.y, z: pb.zoomZ ?? 1.8 }
        zoomDelayRef.current -= dt
        if (zoomDelayRef.current <= 0) {
          onSelectRef.current(pb)
          pendingRef.current = null
        }
      }
      const cam = camRef.current,
        tgt = camTargetRef.current
      const lerpS = 0.09
      cam.tx += (tgt.tx - cam.tx) * lerpS
      cam.ty += (tgt.ty - cam.ty) * lerpS
      cam.z += (tgt.z - cam.z) * lerpS

      // Trails
      if (loadTRef.current > 0.88) {
        bods.forEach((b) => {
          if (!interactive.has(b.id) || b.id === 'asteroids') return
          const wp = getWorldPos(b, angles, moonLocalAngle.current)
          const tr = trailsRef.current.get(b.id) ?? []
          tr.push({ x: wp.x, y: wp.y })
          if (tr.length > 60) tr.shift()
          trailsRef.current.set(b.id, tr)
        })
      }

      // Shooting stars
      nextShootRef.current -= dt
      if (nextShootRef.current <= 0) {
        const ang = Math.random() * Math.PI * 0.5 + Math.PI * 0.1
        const spd = 700 + Math.random() * 600
        shootsRef.current.push({
          x: Math.random() * W * 0.8,
          y: Math.random() * H * 0.35,
          vx: Math.cos(ang) * spd,
          vy: Math.sin(ang) * spd,
          life: 1,
          decay: 1.4 + Math.random() * 0.8,
          len: 70 + Math.random() * 110,
        })
        nextShootRef.current = 2.2 + Math.random() * 4.5
      }

      // ── Draw ──────────────────────────────────────────────────────────────
      ctx.clearRect(0, 0, W, H)

      // Nebula
      const neb = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.72)
      neb.addColorStop(0, 'rgba(38,10,78,0.16)')
      neb.addColorStop(0.45, 'rgba(10,5,40,0.07)')
      neb.addColorStop(1, 'transparent')
      ctx.fillStyle = neb
      ctx.fillRect(0, 0, W, H)
      const neb2 = ctx.createRadialGradient(
        W / 2 - 200,
        H / 2 + 120,
        0,
        W / 2 - 200,
        H / 2 + 120,
        340,
      )
      neb2.addColorStop(0, 'rgba(5,20,80,0.09)')
      neb2.addColorStop(1, 'transparent')
      ctx.fillStyle = neb2
      ctx.fillRect(0, 0, W, H)

      // Stars + parallax
      starsRef.current.forEach((s) => {
        s.phase += s.spd
        const op = s.op * (0.7 + 0.3 * Math.sin(s.phase))
        ctx.beginPath()
        ctx.arc(s.x * W + px * s.depth * 28, s.y * H + py * s.depth * 18, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(226,232,240,${op.toFixed(3)})`
        ctx.fill()
      })

      // Shooting stars
      shootsRef.current = shootsRef.current.filter((s) => {
        s.x += s.vx * dt
        s.y += s.vy * dt
        s.life -= s.decay * dt
        if (s.life <= 0) return false
        const mag = Math.hypot(s.vx, s.vy)
        const tx = s.x - (s.vx / mag) * s.len * s.life,
          ty = s.y - (s.vy / mag) * s.len * s.life
        const g = ctx.createLinearGradient(tx, ty, s.x, s.y)
        g.addColorStop(0, 'transparent')
        g.addColorStop(0.7, hexAlpha('#ffffff', s.life * 0.55))
        g.addColorStop(1, hexAlpha('#ffffff', s.life * 0.9))
        ctx.beginPath()
        ctx.moveTo(tx, ty)
        ctx.lineTo(s.x, s.y)
        ctx.strokeStyle = g
        ctx.lineWidth = s.life * 1.8
        ctx.lineCap = 'round'
        ctx.stroke()
        return true
      })

      // ── Camera transform ───────────────────────────────────────────────────
      ctx.save()
      ctx.translate(W / 2, H / 2)
      ctx.scale(cam.z, cam.z)
      ctx.translate(-cam.tx, -cam.ty)

      function drawOrbit(r: number, dash: number[] = [4, 10], alpha = 0.045): void {
        ctx.beginPath()
        ctx.arc(0, 0, r * loadE, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255,255,255,${alpha})`
        ctx.lineWidth = 1
        ctx.setLineDash(dash)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ;[66, 92, 122, 158, 228, 268, 302, 334, 362].forEach((r) => drawOrbit(r))
      ;[183, 190, 197].forEach((r) => drawOrbit(r, [2, 14], 0.028))

      const ea0 = angles['earth'] ?? 0
      const exOrb = 122 * loadE * Math.cos(ea0),
        eyOrb = 122 * loadE * Math.sin(ea0)
      ctx.beginPath()
      ctx.arc(exOrb, eyOrb, MOON_ORBIT_R, 0, Math.PI * 2)
      ctx.strokeStyle = 'rgba(255,255,255,0.04)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 5])
      ctx.stroke()
      ctx.setLineDash([])

      // Trails
      trailsRef.current.forEach((trail, id) => {
        const body = bods.find((b) => b.id === id)
        if (!trail.length || !body) return
        for (let i = 1; i < trail.length; i++) {
          const prev = trail[i - 1],
            curr = trail[i]
          if (!prev || !curr) continue
          const frac = i / trail.length
          ctx.beginPath()
          ctx.moveTo(prev.x, prev.y)
          ctx.lineTo(curr.x, curr.y)
          ctx.strokeStyle = hexAlpha(body.color, frac * 0.42)
          ctx.lineWidth = body.r * 0.36 * frac
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      })

      // Asteroid belt
      let astHovered = false
      const wmMouse = toWorld(mx, my, W, H, cam)
      asteroidsRef.current.forEach((ast) => {
        const r = (220 + ast.variance) * loadE
        const ax = r * Math.cos(ast.angle),
          ay = r * Math.sin(ast.angle)
        const isH =
          interactive.has('asteroids') &&
          hitWorld(wmMouse.x, wmMouse.y, ax, ay, (ast.r + 5) / cam.z)
        if (isH) astHovered = true
        ctx.beginPath()
        ctx.arc(ax, ay, ast.r + (isH ? 1.5 : 0), 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${isH ? '148,163,184' : '100,116,139'},${isH ? ast.op + 0.35 : ast.op})`
        ctx.fill()
      })

      // Saturn rings (before saturn body for depth)
      const satBody = bods.find((b) => b.id === 'saturn')!
      const sa = angles['saturn'] ?? 0
      const sWx = satBody.orbit * loadE * Math.cos(sa),
        sWy = satBody.orbit * loadE * Math.sin(sa)
      ctx.save()
      ctx.translate(sWx, sWy)
      ctx.scale(1, 0.32)
      const ringDefs: [number, string, number][] = [
        [satBody.r * 2.5, 'rgba(254,243,199,0.28)', satBody.r * 0.55],
        [satBody.r * 1.9, 'rgba(254,237,160,0.18)', satBody.r * 0.35],
      ]
      ringDefs.forEach(([r, color, lw]) => {
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, Math.PI * 2)
        ctx.strokeStyle = color
        ctx.lineWidth = lw
        ctx.stroke()
      })
      ctx.restore()

      // Planets + Sun
      let newHoverId: string | null = null
      let newHoverInfo: HoverInfo | null = null

      bods.forEach((b) => {
        if (b.id === 'sun') return

        let dwx: number, dwy: number
        if (b.id === 'moon') {
          const ea = angles['earth'] ?? 0
          dwx = 122 * loadE * Math.cos(ea) + MOON_ORBIT_R * Math.cos(moonLocalAngle.current)
          dwy = 122 * loadE * Math.sin(ea) + MOON_ORBIT_R * Math.sin(moonLocalAngle.current)
        } else {
          dwx = b.orbit * loadE * Math.cos(angles[b.id] ?? 0)
          dwy = b.orbit * loadE * Math.sin(angles[b.id] ?? 0)
          if (b.orbit === 0) {
            dwx = 0
            dwy = 0
          }
        }

        const isInteractive = interactive.has(b.id)
        const isH = isInteractive && hitWorld(wmMouse.x, wmMouse.y, dwx, dwy, (b.r + 8) / cam.z)
        if (isH && b.id !== 'asteroids') {
          newHoverId = b.id
          const cs = toCanvas(dwx, dwy, W, H, cam)
          newHoverInfo = {
            id: b.id,
            label: typeLabel(b.type),
            title:
              b.type === 'spaceNews'
                ? `${(b.data as SpaceNewsItem[]).length} items this week`
                : ((b.data as { title: string })?.title ?? ''),
            color: b.color,
            planetName: b.name,
            x: cs.x,
            y: cs.y - b.r * cam.z - 8,
          }
        }

        if (isInteractive) {
          const glowR = b.r * (isH ? 4.8 : 3.2)
          const g = ctx.createRadialGradient(dwx, dwy, 0, dwx, dwy, glowR)
          g.addColorStop(0, hexAlpha(b.color, 0.7))
          g.addColorStop(0.35, hexAlpha(b.color, 0.22))
          g.addColorStop(1, 'transparent')
          ctx.beginPath()
          ctx.arc(dwx, dwy, glowR, 0, Math.PI * 2)
          ctx.fillStyle = g
          ctx.fill()
        }

        const pg = ctx.createRadialGradient(dwx - b.r * 0.28, dwy - b.r * 0.28, 0, dwx, dwy, b.r)
        pg.addColorStop(0, b.color)
        pg.addColorStop(1, hexAlpha(b.glow, 0.75))
        ctx.beginPath()
        ctx.arc(dwx, dwy, b.r, 0, Math.PI * 2)
        ctx.fillStyle = pg
        ctx.fill()

        if (selectedIdRef.current === b.id) {
          ctx.beginPath()
          ctx.arc(dwx, dwy, b.r + 5, 0, Math.PI * 2)
          ctx.strokeStyle = hexAlpha(b.color, 0.7)
          ctx.lineWidth = 1.5
          ctx.setLineDash([3, 4])
          ctx.stroke()
          ctx.setLineDash([])
        }

        if (isInteractive && cam.z > 1.6) {
          ctx.font = `400 ${10 / cam.z}px "IBM Plex Mono", monospace`
          ctx.fillStyle = 'rgba(100,116,139,0.7)'
          ctx.textAlign = 'center'
          ctx.fillText(b.name, dwx, dwy + b.r + 14 / cam.z)
        }
      })

      // Sun
      const sun = bods.find((b) => b.id === 'sun')!
      const sunH = hitWorld(wmMouse.x, wmMouse.y, 0, 0, (sun.r + 14) / cam.z)
      if (sunH) {
        newHoverId = 'sun'
        const cs = toCanvas(0, 0, W, H, cam)
        newHoverInfo = {
          id: 'sun',
          label: 'Big Story',
          title: (sun.data as BigStory)?.title ?? '',
          color: '#fbbf24',
          planetName: 'The Sun',
          x: cs.x,
          y: cs.y - sun.r * cam.z - 8,
        }
      }
      const pulse = 1 + 0.035 * Math.sin(t / 700)
      const sunLayers: [number, number][] = [
        [5.5, 0.06],
        [3.9, 0.1],
        [2.6, 0.17],
        [1.65, 0.3],
      ]
      sunLayers.forEach(([mult, op]) => {
        const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, sun.r * mult * pulse)
        gr.addColorStop(0, `rgba(251,191,36,${op * (sunH ? 1.5 : 1)})`)
        gr.addColorStop(0.5, `rgba(245,158,11,${op * 0.38 * (sunH ? 1.5 : 1)})`)
        gr.addColorStop(1, 'transparent')
        ctx.beginPath()
        ctx.arc(0, 0, sun.r * mult * pulse, 0, Math.PI * 2)
        ctx.fillStyle = gr
        ctx.fill()
      })
      const sg = ctx.createRadialGradient(-sun.r * 0.22, -sun.r * 0.22, 0, 0, 0, sun.r * pulse)
      sg.addColorStop(0, '#fef9c3')
      sg.addColorStop(0.35, '#fbbf24')
      sg.addColorStop(1, '#b45309')
      ctx.beginPath()
      ctx.arc(0, 0, sun.r * pulse, 0, Math.PI * 2)
      ctx.fillStyle = sg
      ctx.fill()
      if (selectedIdRef.current === 'sun') {
        ctx.beginPath()
        ctx.arc(0, 0, sun.r * pulse + 7, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(251,191,36,0.7)'
        ctx.lineWidth = 1.5
        ctx.setLineDash([3, 4])
        ctx.stroke()
        ctx.setLineDash([])
      }

      if (astHovered && !newHoverId) {
        newHoverId = 'asteroids'
        const astBody = bods.find((b) => b.id === 'asteroids')
        const count = Array.isArray(astBody?.data) ? (astBody.data as SpaceNewsItem[]).length : 0
        newHoverInfo = {
          id: 'asteroids',
          label: 'Space News',
          title: `${count} items this week`,
          color: '#64748b',
          planetName: 'Asteroid Belt',
          x: mx,
          y: my,
        }
      }

      ctx.restore()

      if (hoverIdRef.current !== newHoverId) {
        hoverIdRef.current = newHoverId
        c.style.cursor = newHoverId ? 'pointer' : 'default'
        setHoverInfo(newHoverInfo)
      }

      animRef.current = requestAnimationFrame(frame)
    }

    animRef.current = requestAnimationFrame(frame)
    return (): void => {
      cancelAnimationFrame(animRef.current)
      window.removeEventListener('resize', setSize)
    }
  }, [])

  // Mouse + click
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const onMove = (e: MouseEvent): void => {
      mouseRef.current = { x: e.clientX, y: e.clientY }
    }
    const onLeave = (): void => {
      mouseRef.current = { x: -9999, y: -9999 }
    }
    const onClick = (): void => {
      if (!hoverIdRef.current) return
      const body = bodiesRef.current.find((b) => b.id === hoverIdRef.current)
      if (!body) return
      if (selectedIdRef.current === body.id) {
        onSelectRef.current(body)
        return
      }
      pendingRef.current = body
      zoomDelayRef.current = 0.48
    }
    canvas.addEventListener('mousemove', onMove)
    canvas.addEventListener('mouseleave', onLeave)
    canvas.addEventListener('click', onClick)
    return (): void => {
      canvas.removeEventListener('mousemove', onMove)
      canvas.removeEventListener('mouseleave', onLeave)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{ position: 'fixed', inset: 0, display: 'block', zIndex: 0 }}
      />
      {hoverInfo && (
        <div
          style={{
            position: 'fixed',
            zIndex: 80,
            pointerEvents: 'none',
            left: hoverInfo.x,
            top: hoverInfo.y,
            transform: 'translate(-50%, -100%) translateY(-14px)',
            background: 'rgba(8,8,26,0.92)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 10,
            padding: '10px 14px',
            backdropFilter: 'blur(12px)',
            maxWidth: 240,
          }}
        >
          <div
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              marginBottom: 4,
              color: hoverInfo.color,
            }}
          >
            {hoverInfo.label}
          </div>
          <div style={{ fontSize: 12, fontWeight: 500, color: '#e2e8f0', lineHeight: 1.45 }}>
            {hoverInfo.title}
          </div>
          <div
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 9,
              color: '#64748b',
              marginTop: 3,
            }}
          >
            {hoverInfo.planetName}
          </div>
        </div>
      )}
    </>
  )
}

// ── Story Panel ──────────────────────────────────────────────────────────────

function SourcePill({ source }: { source: string }): JSX.Element {
  const c = SRC_COLOR[source] ?? '#94a3b8'
  const label = SRC_LABEL[source] ?? source
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        fontFamily: '"IBM Plex Mono", monospace',
        fontSize: 9,
        fontWeight: 700,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        padding: '3px 9px',
        borderRadius: 5,
        marginBottom: 14,
        background: c + '1a',
        color: c,
      }}
    >
      {label}
    </span>
  )
}

function PanelContent({ body }: { body: BodyDef }): JSX.Element | null {
  if (!body.data) return null

  const panelSummary: React.CSSProperties = {
    fontSize: 14,
    lineHeight: 1.75,
    color: '#94a3b8',
    marginBottom: 20,
  }
  const panelLink: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    fontSize: 13,
    color: '#818cf8',
    textDecoration: 'none',
    fontFamily: '"IBM Plex Mono", monospace',
  }

  switch (body.type) {
    case 'bigStory': {
      const d = body.data as BigStory
      return (
        <>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 4,
              marginBottom: 16,
            }}
          >
            <SourcePill source={d.source} />
            {d.relevanceScore !== undefined && (
              <span
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  color: '#64748b',
                  marginLeft: 10,
                }}
              >
                {d.relevanceScore.toFixed(2)} relevance
              </span>
            )}
          </div>
          <p style={panelSummary}>{d.summary}</p>
          <a style={panelLink} href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
            Read original ↗
          </a>
        </>
      )
    }
    case 'quickHit': {
      const d = body.data as QuickHit
      return (
        <>
          <SourcePill source={d.source} />
          <p style={panelSummary}>{d.summary}</p>
          <a style={panelLink} href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
            Read more ↗
          </a>
        </>
      )
    }
    case 'imageOfWeek': {
      const d = body.data as ImageOfWeek
      return (
        <>
          <div
            style={{
              width: '100%',
              aspectRatio: '16/9',
              borderRadius: 10,
              overflow: 'hidden',
              background: '#080820',
              marginBottom: 14,
              border: '1px solid rgba(255,255,255,0.07)',
            }}
          >
            <img
              src={d.imageUrl}
              alt={d.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
          <p style={panelSummary}>{d.description}</p>
          {d.credit && (
            <p
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9,
                color: '#334155',
                marginTop: 10,
              }}
            >
              Credit: {d.credit}
            </p>
          )}
        </>
      )
    }
    case 'paperDeepDive': {
      const d = body.data as PaperDeepDive
      return (
        <>
          <SourcePill source="arxiv" />
          <div
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              color: '#64748b',
              lineHeight: 1.7,
              marginBottom: 14,
              fontStyle: 'italic',
            }}
          >
            {d.authors.join(' · ')}
          </div>
          <p style={panelSummary}>{d.summary}</p>
          <a style={panelLink} href={d.arxivUrl} target="_blank" rel="noopener noreferrer">
            View on arXiv ↗
          </a>
        </>
      )
    }
    case 'spaceNews': {
      const items = body.data as SpaceNewsItem[]
      return (
        <>
          <p
            style={{
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: 10,
              color: '#334155',
              marginBottom: 14,
              letterSpacing: '0.1em',
            }}
          >
            {items.length} ITEMS THIS WEEK
          </p>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                padding: '14px 0',
                borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#e2e8f0',
                  marginBottom: 4,
                  lineHeight: 1.45,
                }}
              >
                {item.title}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.55 }}>{item.summary}</div>
              {item.sourceUrl && (
                <a
                  href={item.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-block',
                    marginTop: 7,
                    fontFamily: '"IBM Plex Mono", monospace',
                    fontSize: 10,
                    color: '#818cf8',
                    textDecoration: 'none',
                  }}
                >
                  Read ↗
                </a>
              )}
            </div>
          ))}
        </>
      )
    }
    default:
      return null
  }
}

function StoryPanel({ body, onClose }: { body: BodyDef | null; onClose: () => void }): JSX.Element {
  const open = !!body
  const accentColor = body
    ? body.type === 'bigStory'
      ? '#fbbf24'
      : body.type === 'imageOfWeek'
        ? '#cbd5e1'
        : body.type === 'paperDeepDive'
          ? '#fb923c'
          : body.type === 'spaceNews'
            ? '#64748b'
            : (SRC_COLOR[(body.data as QuickHit)?.source] ?? '#60a5fa')
    : '#60a5fa'

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, pointerEvents: open ? 'all' : 'none' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          right: 0,
          bottom: 0,
          width: 440,
          background: 'rgba(5,5,18,0.96)',
          borderLeft: '1px solid rgba(255,255,255,0.07)',
          backdropFilter: 'blur(24px)',
          display: 'flex',
          flexDirection: 'column',
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.42s cubic-bezier(0.16,1,0.3,1)',
        }}
      >
        <div
          style={{
            padding: '22px 22px 18px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 14,
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontFamily: '"IBM Plex Mono", monospace',
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '0.22em',
                textTransform: 'uppercase',
                marginBottom: 4,
                color: accentColor,
              }}
            >
              {body ? typeLabel(body.type) : ''}
            </div>
            {body?.name && (
              <div
                style={{
                  fontFamily: '"IBM Plex Mono", monospace',
                  fontSize: 10,
                  color: '#64748b',
                  marginBottom: 6,
                }}
              >
                {body.name}
              </div>
            )}
            <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.42, color: '#f1f5f9' }}>
              {!body
                ? ''
                : body.type === 'spaceNews'
                  ? 'Space News'
                  : ((body.data as { title: string })?.title ?? '')}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              flexShrink: 0,
              width: 30,
              height: 30,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 7,
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: 17,
              lineHeight: 1,
              marginTop: 1,
            }}
          >
            ×
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: 22 }}>
          {body && <PanelContent body={body} />}
        </div>
      </div>
    </div>
  )
}

// ── Speed Control ─────────────────────────────────────────────────────────────

function SpeedControl({
  speed,
  onChange,
}: {
  speed: number
  onChange: (v: number) => void
}): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'rgba(6,6,20,0.75)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 24,
        padding: '8px 18px',
        backdropFilter: 'blur(14px)',
      }}
    >
      <span style={{ fontSize: 13 }}>🌀</span>
      <input
        type="range"
        min="0.25"
        max="4"
        step="0.25"
        value={speed}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="solar-speed-slider"
        style={{
          width: 90,
          height: 3,
          appearance: 'none',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: 2,
          outline: 'none',
          cursor: 'pointer',
        }}
      />
      <span
        style={{
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 10,
          color: '#475569',
          letterSpacing: '0.1em',
          minWidth: 28,
          textAlign: 'right',
        }}
      >
        {speed}×
      </span>
    </div>
  )
}

// ── Legend ─────────────────────────────────────────────────────────────────────

const LEGEND_ITEMS = [
  { id: 'sun', color: '#fbbf24', label: 'Sun — Big Story' },
  { id: 'mercury', color: '#94a3b8', label: 'Mercury — Quick Hit' },
  { id: 'venus', color: '#fde68a', label: 'Venus — Quick Hit' },
  { id: 'earth', color: '#3b82f6', label: 'Earth — Quick Hit' },
  { id: 'moon', color: '#e2e8f0', label: 'Moon — Image of Week' },
  { id: 'mars', color: '#f87171', label: 'Mars' },
  { id: 'asteroids', color: '#64748b', label: 'Belt — Space News' },
  { id: 'jupiter', color: '#fb923c', label: 'Jupiter — Paper Dive' },
  { id: 'saturn', color: '#fef3c7', label: 'Saturn' },
  { id: 'uranus', color: '#67e8f9', label: 'Uranus' },
  { id: 'neptune', color: '#818cf8', label: 'Neptune' },
  { id: 'pluto', color: '#c4a882', label: 'Pluto' },
]

function Legend({
  bodies,
  onSelect,
}: {
  bodies: BodyDef[]
  onSelect: (body: BodyDef) => void
}): JSX.Element {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: 28,
        left: 28,
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        gap: 9,
      }}
    >
      {LEGEND_ITEMS.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            const b = bodies.find((bd) => bd.id === item.id)
            if (b) onSelect(b)
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            fontSize: 11,
            color: '#334155',
            fontFamily: '"IBM Plex Mono", monospace',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            background: 'none',
            border: 'none',
            padding: 0,
            transition: 'color 0.2s',
            textAlign: 'left',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = '#94a3b8'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLElement).style.color = '#334155'
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              background: item.color,
              boxShadow: `0 0 7px ${item.color}88`,
            }}
          />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────────────────────

interface SolarDigestProps {
  digest: Digest
}

export function SolarDigest({ digest }: SolarDigestProps): JSX.Element {
  const [selected, setSelected] = useState<BodyDef | null>(null)
  const [userSpeed, setUserSpeed] = useState(1)
  const bodies = buildBodies(digest)

  const weekDate = new Date(digest.weekStart).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })

  const handleSelect = useCallback((body: BodyDef): void => {
    setSelected((prev) => (prev?.id === body.id ? null : body))
  }, [])

  const handleClose = useCallback((): void => {
    setSelected(null)
  }, [])

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', background: '#04040e' }}
    >
      <SolarCanvas
        bodies={bodies}
        onSelect={handleSelect}
        selectedId={selected?.id ?? null}
        userSpeed={userSpeed}
      />
      <StoryPanel body={selected} onClose={handleClose} />
      <Legend bodies={bodies} onSelect={handleSelect} />
      <SpeedControl speed={userSpeed} onChange={setUserSpeed} />
      <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 50, textAlign: 'right' }}>
        <div
          style={{
            fontFamily: '"IBM Plex Mono", monospace',
            fontSize: 9,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: '#1e293b',
          }}
        >
          Weekly Digest
        </div>
        <div style={{ fontSize: 11, color: '#334155', marginTop: 3 }}>Week of {weekDate}</div>
      </div>
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, calc(-50% + 60px))',
          pointerEvents: 'none',
          zIndex: 40,
          fontFamily: '"IBM Plex Mono", monospace',
          fontSize: 9,
          letterSpacing: '0.2em',
          color: 'rgba(100,116,139,0.4)',
          textTransform: 'uppercase',
          textAlign: 'center',
          transition: 'opacity 0.5s',
          opacity: selected ? 0 : 1,
        }}
      >
        Click any highlighted object to read
      </div>
    </div>
  )
}
