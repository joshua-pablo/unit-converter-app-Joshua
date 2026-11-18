// Generates Convertly's app icons (PWA + Android source assets) with no dependencies.
// Usage: node scripts/make-icons.mjs
import { writeFileSync, mkdirSync } from 'node:fs'
import { deflateSync } from 'node:zlib'

const BG = [15, 16, 19]
const LIME = [212, 245, 60]
const INK = [20, 22, 5]

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})
const crc32 = (buf) => {
  let c = 0xffffffff
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length)
  const td = Buffer.concat([Buffer.from(type), data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td))
  return Buffer.concat([len, td, crc])
}
function png(size, pixel, ss = 3) {
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++) for (let sx = 0; sx < ss; sx++) {
        const [pr, pg, pb, pa] = pixel((x + (sx + 0.5) / ss) / size, (y + (sy + 0.5) / ss) / size)
        r += pr * pa; g += pg * pa; b += pb * pa; a += pa
      }
      const o = y * (size * 4 + 1) + 1 + x * 4
      const n = ss * ss
      raw[o] = a ? r / a : 0; raw[o + 1] = a ? g / a : 0; raw[o + 2] = a ? b / a : 0; raw[o + 3] = (a / n) * 255
    }
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ])
}

const inRoundRect = (x, y, inset, r) => {
  const lo = inset, hi = 1 - inset
  if (x < lo || x > hi || y < lo || y > hi) return false
  const cx = Math.min(Math.max(x, lo + r), hi - r)
  const cy = Math.min(Math.max(y, lo + r), hi - r)
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r
}

// The mark: a lime disc with two opposing arrows ("convert"). scale = disc radius.
function mark(x, y, scale) {
  const dx = x - 0.5, dy = y - 0.5
  if (dx * dx + dy * dy > scale * scale) return null
  const u = dx / scale, v = dy / scale // -1..1 within the disc
  const arrow = (cx, dir) => {
    const w = 0.085, tip = -0.62 * dir, base = -0.22 * dir, tail = 0.58 * dir
    const t = (v - tip) / (base - tip)
    if (t >= 0 && t <= 1 && Math.abs(u - cx) <= 0.27 * t) return true
    const [a, b] = [Math.min(base, tail), Math.max(base, tail)]
    return Math.abs(u - cx) <= w && v >= a && v <= b
  }
  return arrow(-0.24, 1) || arrow(0.24, -1) ? INK : LIME
}

const any = (x, y) => {
  if (!inRoundRect(x, y, 0, 0.22)) return [0, 0, 0, 0]
  return [...(mark(x, y, 0.33) ?? BG), 1]
}
const full = (scale) => (x, y) => [...(mark(x, y, scale) ?? BG), 1]
const foreground = (x, y) => {
  const m = mark(x, y, 0.22)
  return m ? [...m, 1] : [0, 0, 0, 0]
}

mkdirSync('public/icons', { recursive: true })
mkdirSync('assets', { recursive: true })
writeFileSync('public/icons/icon-192.png', png(192, any))
writeFileSync('public/icons/icon-512.png', png(512, any))
writeFileSync('public/icons/maskable-512.png', png(512, full(0.3)))
writeFileSync('assets/icon-only.png', png(1024, full(0.32), 2))
writeFileSync('assets/icon-foreground.png', png(1024, foreground, 2))
writeFileSync('assets/icon-background.png', png(1024, () => [...BG, 1], 1))
const splash = png(2732, full(0.09), 1)
writeFileSync('assets/splash.png', splash)
writeFileSync('assets/splash-dark.png', splash)
console.log('icons written')
