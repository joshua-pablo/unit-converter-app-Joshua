import type { Unit } from './units'

// Exchange rates come from the free, key-less Frankfurter API (ECB reference
// rates, EUR base). They are cached on-device so the converter keeps working offline.

const CACHE_KEY = 'convertly.rates.v1'

export type Rates = { base: 'EUR'; date: string; rates: Record<string, number>; live: boolean }

const NAMES: Record<string, string> = {
  EUR: 'Euro', USD: 'US Dollar', GBP: 'British Pound', JPY: 'Japanese Yen', CHF: 'Swiss Franc',
  CAD: 'Canadian Dollar', AUD: 'Australian Dollar', NZD: 'New Zealand Dollar', CNY: 'Chinese Yuan',
  HKD: 'Hong Kong Dollar', SGD: 'Singapore Dollar', INR: 'Indian Rupee', KRW: 'South Korean Won',
  BRL: 'Brazilian Real', MXN: 'Mexican Peso', ZAR: 'South African Rand', TRY: 'Turkish Lira',
  SEK: 'Swedish Krona', NOK: 'Norwegian Krone', DKK: 'Danish Krone', PLN: 'Polish Złoty',
  CZK: 'Czech Koruna', HUF: 'Hungarian Forint', RON: 'Romanian Leu', BGN: 'Bulgarian Lev',
  ISK: 'Icelandic Króna', ILS: 'Israeli Shekel', IDR: 'Indonesian Rupiah', MYR: 'Malaysian Ringgit',
  PHP: 'Philippine Peso', THB: 'Thai Baht',
}

// Approximate fallback rates (per 1 EUR) used only before the first successful fetch.
const FALLBACK: Record<string, number> = {
  EUR: 1, USD: 1.08, GBP: 0.85, JPY: 163, CHF: 0.95, CAD: 1.48, AUD: 1.64, NZD: 1.79,
  CNY: 7.8, HKD: 8.4, SGD: 1.45, INR: 90.5, KRW: 1480, BRL: 6.0, MXN: 19.5, ZAR: 20,
  TRY: 36, SEK: 11.4, NOK: 11.7, DKK: 7.46, PLN: 4.3, CZK: 25.2, HUF: 395, RON: 4.97,
  BGN: 1.96, ISK: 150, ILS: 4.0, IDR: 17300, MYR: 4.9, PHP: 62, THB: 38.5,
}

export function loadCachedRates(): Rates {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (raw) return { ...(JSON.parse(raw) as Rates), live: false }
  } catch {
    /* ignore */
  }
  return { base: 'EUR', date: 'offline estimate', rates: FALLBACK, live: false }
}

export async function fetchRates(): Promise<Rates | null> {
  const urls = ['https://api.frankfurter.dev/v1/latest', 'https://api.frankfurter.app/latest']
  for (const url of urls) {
    try {
      const res = await fetch(url)
      if (!res.ok) continue
      const data = (await res.json()) as { date: string; rates: Record<string, number> }
      const rates: Rates = { base: 'EUR', date: data.date, rates: { EUR: 1, ...data.rates }, live: true }
      localStorage.setItem(CACHE_KEY, JSON.stringify(rates))
      return rates
    } catch {
      /* try next */
    }
  }
  return null
}

export function currencyUnits(r: Rates): Unit[] {
  return Object.keys(r.rates)
    .sort((a, b) => (NAMES[a] ?? a).localeCompare(NAMES[b] ?? b))
    .map((code) => {
      const perEur = r.rates[code]
      return {
        id: code,
        name: NAMES[code] ?? code,
        symbol: code,
        toBase: (v: number) => v / perEur,
        fromBase: (v: number) => v * perEur,
      }
    })
}
