import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import {
  CATEGORIES, RADIX, convert, convertBase, formatNumber, getCategory, plainNumber,
  type Category, type Unit,
} from './units'
import { currencyUnits, fetchRates, loadCachedRates, type Rates } from './currency'

/* ---------------------------------------------------------------- storage */

function usePersistent<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* storage full or unavailable */
    }
  }, [key, value])
  return [value, setValue] as const
}

type Pair = { cat: string; from: string; to: string }
type HistoryItem = Pair & { input: string; output: string; t: number }

const buzz = () => navigator.vibrate?.(8)

/* ----------------------------------------------------------------- router */

type Route = { name: 'home' } | { name: 'saved' } | { name: 'convert'; cat: string; from?: string; to?: string }

function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '')
  const [a, b, c, d] = h.split('/')
  if (a === 'c' && b && getCategory(b)) return { name: 'convert', cat: b, from: c, to: d }
  if (a === 'saved') return { name: 'saved' }
  return { name: 'home' }
}

function useRoute() {
  const [route, setRoute] = useState<Route>(parseHash)
  useEffect(() => {
    const on = () => setRoute(parseHash())
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

const go = (hash: string) => {
  location.hash = hash
}

/* -------------------------------------------------------------------- app */

export default function App() {
  const route = useRoute()
  const [rates, setRates] = useState<Rates>(loadCachedRates)
  const [favorites, setFavorites] = usePersistent<Pair[]>('convertly.favorites', [])
  const [history, setHistory] = usePersistent<HistoryItem[]>('convertly.history', [])
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => {
    fetchRates().then((r) => r && setRates(r))
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 1600)
    return () => clearTimeout(t)
  }, [toast])

  const categories = useMemo(
    () => CATEGORIES.map((c) => (c.kind === 'currency' ? { ...c, units: currencyUnits(rates) } : c)),
    [rates],
  )
  const catById = useCallback((id: string) => categories.find((c) => c.id === id)!, [categories])

  const tab = route.name === 'saved' ? 'saved' : 'home'

  return (
    <div className="shell">
      <main className="screen" key={route.name === 'convert' ? `c-${route.cat}` : route.name}>
        {route.name === 'home' && <Home categories={categories} favorites={favorites} catById={catById} />}
        {route.name === 'saved' && (
          <Saved
            favorites={favorites}
            history={history}
            catById={catById}
            onRemoveFav={(p) => setFavorites((f) => f.filter((x) => !samePair(x, p)))}
            onClearHistory={() => setHistory([])}
          />
        )}
        {route.name === 'convert' && (
          <Converter
            key={route.cat}
            cat={catById(route.cat)}
            initialFrom={route.from}
            initialTo={route.to}
            rates={rates}
            favorites={favorites}
            setFavorites={setFavorites}
            onRecord={(item) =>
              setHistory((h) => {
                const rest = h.filter((x) => !samePair(x, item))
                return [item, ...rest].slice(0, 40)
              })
            }
            toast={setToast}
          />
        )}
      </main>

      {route.name !== 'convert' && (
        <nav className="tabbar">
          <button className={tab === 'home' ? 'on' : ''} onClick={() => go('/')}>
            <GridIcon />
            <span>Convert</span>
          </button>
          <button className={tab === 'saved' ? 'on' : ''} onClick={() => go('/saved')}>
            <StarIcon filled={tab === 'saved'} />
            <span>Saved</span>
          </button>
        </nav>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

const samePair = (a: Pair, b: Pair) => a.cat === b.cat && a.from === b.from && a.to === b.to

/* ------------------------------------------------------------------- home */

function useInstallPrompt() {
  const [evt, setEvt] = useState<(Event & { prompt: () => Promise<void> }) | null>(null)
  useEffect(() => {
    const on = (e: Event) => {
      e.preventDefault()
      setEvt(e as Event & { prompt: () => Promise<void> })
    }
    window.addEventListener('beforeinstallprompt', on)
    return () => window.removeEventListener('beforeinstallprompt', on)
  }, [])
  return evt ? () => evt.prompt().then(() => setEvt(null)) : null
}

function Home({
  categories, favorites, catById,
}: { categories: Category[]; favorites: Pair[]; catById: (id: string) => Category }) {
  const [q, setQ] = useState('')
  const install = useInstallPrompt()

  const results = useMemo(() => {
    const s = q.trim().toLowerCase()
    if (!s) return null
    const out: { cat: Category; unit: Unit }[] = []
    for (const cat of categories) {
      for (const unit of cat.units) {
        if (
          unit.name.toLowerCase().includes(s) ||
          unit.symbol.toLowerCase() === s ||
          unit.id.toLowerCase() === s ||
          cat.name.toLowerCase().startsWith(s)
        ) out.push({ cat, unit })
      }
    }
    return out.slice(0, 40)
  }, [q, categories])

  return (
    <div className="page">
      <header className="home-head">
        <div>
          <p className="eyebrow">{categories.length} categories · {categories.reduce((n, c) => n + c.units.length, 0)} units</p>
          <h1>Convertly</h1>
        </div>
        {install && (
          <button className="pill" onClick={install}>
            Install app
          </button>
        )}
      </header>

      <label className="search">
        <SearchIcon />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search units — psi, cups, yen…"
          enterKeyHint="search"
        />
        {q && (
          <button className="x" onClick={() => setQ('')} aria-label="Clear search">
            ×
          </button>
        )}
      </label>

      {results ? (
        <ul className="list">
          {results.length === 0 && <li className="empty">No units match “{q}”.</li>}
          {results.map(({ cat, unit }) => (
            <li key={cat.id + unit.id}>
              <button
                className="row"
                onClick={() => {
                  const [, other] = cat.defaults
                  go(`/c/${cat.id}/${unit.id}/${other === unit.id ? cat.defaults[0] : other}`)
                }}
              >
                <span className="dot" style={{ ['--h' as string]: cat.hue }}>{cat.glyph}</span>
                <span className="row-main">
                  <strong>{unit.name}</strong>
                  <small>{cat.name}</small>
                </span>
                <span className="sym">{unit.symbol}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <>
          {favorites.length > 0 && (
            <section>
              <h2 className="section-title">Pinned</h2>
              <div className="chips">
                {favorites.map((f) => {
                  const cat = catById(f.cat)
                  const a = cat?.units.find((u) => u.id === f.from)
                  const b = cat?.units.find((u) => u.id === f.to)
                  if (!a || !b) return null
                  return (
                    <button key={`${f.cat}${f.from}${f.to}`} className="chip" onClick={() => go(`/c/${f.cat}/${f.from}/${f.to}`)}>
                      {a.symbol} <span>→</span> {b.symbol}
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          <section>
            <h2 className="section-title">Categories</h2>
            <div className="grid">
              {categories.map((c, i) => (
                <button
                  key={c.id}
                  className="tile"
                  style={{ ['--h' as string]: c.hue, animationDelay: `${i * 18}ms` }}
                  onClick={() => {
                    buzz()
                    go(`/c/${c.id}`)
                  }}
                >
                  <span className="glyph">{c.glyph}</span>
                  <span className="tile-name">{c.name}</span>
                  <span className="tile-count">{c.units.length} units</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

/* -------------------------------------------------------------- converter */

function Converter({
  cat, initialFrom, initialTo, rates, favorites, setFavorites, onRecord, toast,
}: {
  cat: Category
  initialFrom?: string
  initialTo?: string
  rates: Rates
  favorites: Pair[]
  setFavorites: (fn: (f: Pair[]) => Pair[]) => void
  onRecord: (h: HistoryItem) => void
  toast: (s: string) => void
}) {
  const [lastPairs, setLastPairs] = usePersistent<Record<string, [string, string]>>('convertly.pairs', {})
  const has = (id?: string) => !!id && cat.units.some((u) => u.id === id)
  const remembered = lastPairs[cat.id]
  const [from, setFrom] = useState(
    has(initialFrom) ? initialFrom! : has(remembered?.[0]) ? remembered![0] : cat.defaults[0],
  )
  const [to, setTo] = useState(
    has(initialTo) ? initialTo! : has(remembered?.[1]) ? remembered![1] : cat.defaults[1],
  )
  const [input, setInput] = useState('1')
  const [picker, setPicker] = useState<null | 'from' | 'to'>(null)
  const [spin, setSpin] = useState(0)

  const isBase = cat.kind === 'base'
  const radix = isBase ? RADIX[from] : 10

  useEffect(() => {
    setLastPairs((p) => ({ ...p, [cat.id]: [from, to] }))
  }, [cat.id, from, to, setLastPairs])

  const fromUnit = cat.units.find((u) => u.id === from)!
  const toUnit = cat.units.find((u) => u.id === to)!
  const num = parseFloat(input)
  const value = Number.isFinite(num) ? num : 0

  const output = isBase ? convertBase(input || '0', from, to) : formatNumber(convert(cat, value, from, to))
  const outputPlain = isBase ? output : plainNumber(convert(cat, value, from, to))

  // Record a history entry once the user pauses typing.
  const recordRef = useRef(onRecord)
  recordRef.current = onRecord
  useEffect(() => {
    if (!input || input === '-' || output === 'Invalid' || output === '—') return
    const t = setTimeout(() => recordRef.current({ cat: cat.id, from, to, input, output, t: Date.now() }), 1400)
    return () => clearTimeout(t)
  }, [cat.id, from, to, input, output])

  const press = useCallback(
    (k: string) => {
      buzz()
      setInput((cur) => {
        if (k === 'back') return cur.length <= 1 || (cur.length === 2 && cur.startsWith('-')) ? '' : cur.slice(0, -1)
        if (k === 'clear') return ''
        if (k === 'sign') return cur.startsWith('-') ? cur.slice(1) : cur ? '-' + cur : '-'
        if (k === '.') {
          if (isBase || cur.includes('.')) return cur
          return (cur === '' || cur === '-' ? cur + '0' : cur) + '.'
        }
        if (cur.replace('-', '').length >= 18) return cur
        if (isBase) {
          const d = parseInt(k, 36)
          if (Number.isNaN(d) || d >= radix) return cur
          const next = (cur === '0' ? '' : cur === '-0' ? '-' : cur) + k.toUpperCase()
          return next
        }
        if (!/^\d$/.test(k)) return cur
        if (cur === '0') return k
        if (cur === '-0') return '-' + k
        return cur + k
      })
    },
    [isBase, radix],
  )

  const swap = useCallback(() => {
    buzz()
    setSpin((s) => s + 1)
    if (isBase) {
      if (output && output !== 'Invalid') setInput(output)
    }
    setFrom(to)
    setTo(from)
  }, [from, to, isBase, output])

  const copy = useCallback(() => {
    if (!outputPlain || outputPlain === 'Invalid') return
    navigator.clipboard?.writeText(outputPlain).then(
      () => toast('Copied ' + outputPlain),
      () => toast('Copy not available'),
    )
  }, [outputPlain, toast])

  // Physical keyboard support.
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (picker || e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key
      if (k === 'Backspace') press('back')
      else if (k === 'Escape' || k === 'Delete') press('clear')
      else if (k === '-') press('sign')
      else if (k === '.' || k === ',') press('.')
      else if (/^[0-9a-zA-Z]$/.test(k)) press(k.toLowerCase())
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [press, picker])

  // Changing the source radix may make the current digits invalid.
  useEffect(() => {
    if (!isBase) return
    setInput((cur) => {
      const s = cur.replace('-', '').toLowerCase()
      return [...s].every((ch) => parseInt(ch, 36) < RADIX[from]) ? cur : ''
    })
  }, [from, isBase])

  const pair = { cat: cat.id, from, to }
  const isFav = favorites.some((f) => samePair(f, pair))

  const hexKeys = ['a', 'b', 'c', 'd', 'e', 'f']

  return (
    <div className="conv" style={{ ['--h' as string]: cat.hue }}>
      <header className="topbar">
        <button className="icon-btn" onClick={() => (history.length > 1 ? history.back() : go('/'))} aria-label="Back">
          <BackIcon />
        </button>
        <h1>{cat.name}</h1>
        <button
          className={'icon-btn' + (isFav ? ' fav' : '')}
          aria-label={isFav ? 'Unpin conversion' : 'Pin conversion'}
          onClick={() => {
            buzz()
            setFavorites((f) => (isFav ? f.filter((x) => !samePair(x, pair)) : [pair, ...f]))
            toast(isFav ? 'Unpinned' : 'Pinned to home')
          }}
        >
          <StarIcon filled={isFav} />
        </button>
      </header>

      <div className="conv-body">
        <section className="panel from">
          <button className="unit-btn" onClick={() => setPicker('from')}>
            <span>{fromUnit.name}</span>
            <Chevron />
          </button>
          <div className="readout" aria-live="polite">
            <span className={'value' + (input ? '' : ' ghost')}>{input || '0'}</span>
            <span className="unit-sym">{fromUnit.symbol}</span>
          </div>
        </section>

        <button className="swap" onClick={swap} aria-label="Swap units" style={{ transform: `rotate(${spin * 180}deg)` }}>
          <SwapIcon />
        </button>

        <section className="panel to" onClick={copy}>
          <button
            className="unit-btn"
            onClick={(e) => {
              e.stopPropagation()
              setPicker('to')
            }}
          >
            <span>{toUnit.name}</span>
            <Chevron />
          </button>
          <div className="readout">
            <span className={'value result' + (output.length > 14 ? ' long' : '')}>{output || '0'}</span>
            <span className="unit-sym">{toUnit.symbol}</span>
          </div>
          <p className="hint">
            {cat.kind === 'currency'
              ? `${rates.live ? 'Live' : 'Cached'} rates · ${rates.date} · tap to copy`
              : 'Tap to copy'}
          </p>
        </section>

        {!isBase && (
          <details className="all">
            <summary>See {fromUnit.symbol} in every unit</summary>
            <ul>
              {cat.units
                .filter((u) => u.id !== from)
                .map((u) => (
                  <li key={u.id}>
                    <button className={u.id === to ? 'on' : ''} onClick={() => setTo(u.id)}>
                      <span>{u.name}</span>
                      <strong>
                        {formatNumber(convert(cat, value, from, u.id))} <em>{u.symbol}</em>
                      </strong>
                    </button>
                  </li>
                ))}
            </ul>
          </details>
        )}
      </div>

      <div className={'keypad' + (isBase ? ' base' : '')}>
        {isBase &&
          hexKeys.map((k) => (
            <button key={k} className="key alt" disabled={parseInt(k, 36) >= radix} onClick={() => press(k)}>
              {k.toUpperCase()}
            </button>
          ))}
        {['7', '8', '9'].map((k) => (
          <Key key={k} k={k} press={press} disabled={isBase && +k >= radix} />
        ))}
        <button className="key fn" onClick={() => press('back')} aria-label="Backspace">
          <BackspaceIcon />
        </button>
        {['4', '5', '6'].map((k) => (
          <Key key={k} k={k} press={press} disabled={isBase && +k >= radix} />
        ))}
        <button className="key fn" onClick={() => press('clear')}>
          C
        </button>
        {['1', '2', '3'].map((k) => (
          <Key key={k} k={k} press={press} disabled={isBase && +k >= radix} />
        ))}
        <button className="key fn" onClick={swap} aria-label="Swap units">
          <SwapIcon />
        </button>
        <button className="key fn" onClick={() => press('sign')}>
          ±
        </button>
        <Key k="0" press={press} />
        <button className="key" disabled={isBase} onClick={() => press('.')}>
          .
        </button>
        <button className="key accent" onClick={copy} aria-label="Copy result">
          <CopyIcon />
        </button>
      </div>

      {picker && (
        <UnitSheet
          title={picker === 'from' ? 'Convert from' : 'Convert to'}
          units={cat.units}
          selected={picker === 'from' ? from : to}
          onPick={(id) => {
            buzz()
            if (picker === 'from') {
              if (id === to) setTo(from)
              setFrom(id)
            } else {
              if (id === from) setFrom(to)
              setTo(id)
            }
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}
    </div>
  )
}

function Key({ k, press, disabled }: { k: string; press: (k: string) => void; disabled?: boolean }) {
  return (
    <button className="key" disabled={disabled} onClick={() => press(k)}>
      {k}
    </button>
  )
}

function UnitSheet({
  title, units, selected, onPick, onClose,
}: {
  title: string
  units: Unit[]
  selected: string
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [q, setQ] = useState('')
  const list = units.filter((u) => {
    const s = q.trim().toLowerCase()
    return !s || u.name.toLowerCase().includes(s) || u.symbol.toLowerCase().includes(s) || u.id.toLowerCase().includes(s)
  })
  useEffect(() => {
    const on = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', on)
    return () => window.removeEventListener('keydown', on)
  }, [onClose])

  return (
    <div className="sheet-wrap" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="grabber" />
        <h3>{title}</h3>
        {units.length > 8 && (
          <label className="search small">
            <SearchIcon />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter units" />
          </label>
        )}
        <ul>
          {list.map((u) => (
            <li key={u.id}>
              <button className={u.id === selected ? 'on' : ''} onClick={() => onPick(u.id)}>
                <span>{u.name}</span>
                <em>{u.symbol}</em>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ saved */

function Saved({
  favorites, history, catById, onRemoveFav, onClearHistory,
}: {
  favorites: Pair[]
  history: HistoryItem[]
  catById: (id: string) => Category
  onRemoveFav: (p: Pair) => void
  onClearHistory: () => void
}) {
  const sym = (p: Pair, id: string) => catById(p.cat)?.units.find((u) => u.id === id)?.symbol ?? id

  return (
    <div className="page">
      <header className="home-head">
        <div>
          <p className="eyebrow">Stored on this device</p>
          <h1>Saved</h1>
        </div>
      </header>

      <section>
        <h2 className="section-title">Pinned conversions</h2>
        {favorites.length === 0 ? (
          <p className="empty">Tap the star in any converter to pin it here and on the home screen.</p>
        ) : (
          <ul className="list">
            {favorites.map((f) => {
              const cat = catById(f.cat)
              if (!cat) return null
              return (
                <li key={`${f.cat}${f.from}${f.to}`} className="row-wrap">
                  <button className="row" onClick={() => go(`/c/${f.cat}/${f.from}/${f.to}`)}>
                    <span className="dot" style={{ ['--h' as string]: cat.hue }}>{cat.glyph}</span>
                    <span className="row-main">
                      <strong>
                        {sym(f, f.from)} → {sym(f, f.to)}
                      </strong>
                      <small>{cat.name}</small>
                    </span>
                  </button>
                  <button className="x" onClick={() => onRemoveFav(f)} aria-label="Remove pin">
                    ×
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <div className="section-row">
          <h2 className="section-title">Recent</h2>
          {history.length > 0 && (
            <button className="link" onClick={onClearHistory}>
              Clear
            </button>
          )}
        </div>
        {history.length === 0 ? (
          <p className="empty">Your recent conversions appear here.</p>
        ) : (
          <ul className="list">
            {history.map((h) => {
              const cat = catById(h.cat)
              if (!cat) return null
              return (
                <li key={`${h.cat}${h.from}${h.to}`}>
                  <button className="row" onClick={() => go(`/c/${h.cat}/${h.from}/${h.to}`)}>
                    <span className="dot" style={{ ['--h' as string]: cat.hue }}>{cat.glyph}</span>
                    <span className="row-main">
                      <strong>
                        {h.input} {sym(h, h.from)} = {h.output} {sym(h, h.to)}
                      </strong>
                      <small>
                        {cat.name} · {timeAgo(h.t)}
                      </small>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function timeAgo(t: number) {
  const s = Math.round((Date.now() - t) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return new Date(t).toLocaleDateString()
}

/* ------------------------------------------------------------------ icons */

const I = (p: { children: ReactNode }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {p.children}
  </svg>
)
const BackIcon = () => <I><path d="M15 5l-7 7 7 7" /></I>
const Chevron = () => <I><path d="M7 10l5 5 5-5" /></I>
const SwapIcon = () => <I><path d="M7 4v16M3 8l4-4 4 4M17 20V4M21 16l-4 4-4-4" /></I>
const CopyIcon = () => <I><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2" /></I>
const BackspaceIcon = () => <I><path d="M21 5H9l-6 7 6 7h12a1 1 0 001-1V6a1 1 0 00-1-1zM18 9l-6 6M12 9l6 6" /></I>
const SearchIcon = () => <I><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></I>
const GridIcon = () => <I><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></I>
const StarIcon = ({ filled }: { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden>
    <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
  </svg>
)
