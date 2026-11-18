// Conversion engine. Every linear unit is defined by its factor relative to the
// category's base unit; non-linear units (temperature, fuel economy) supply
// explicit toBase/fromBase functions.

export type Unit = {
  id: string
  name: string
  symbol: string
  toBase: (v: number) => number
  fromBase: (v: number) => number
}

export type Category = {
  id: string
  name: string
  glyph: string
  hue: number
  kind?: 'linear' | 'base' | 'currency'
  units: Unit[]
  defaults: [string, string]
}

const lin = (id: string, name: string, symbol: string, factor: number): Unit => ({
  id,
  name,
  symbol,
  toBase: (v) => v * factor,
  fromBase: (v) => v / factor,
})

const fn = (
  id: string,
  name: string,
  symbol: string,
  toBase: (v: number) => number,
  fromBase: (v: number) => number,
): Unit => ({ id, name, symbol, toBase, fromBase })

const DAY = 86400
const YEAR = 365.2425 * DAY

export const CATEGORIES: Category[] = [
  {
    id: 'length', name: 'Length', glyph: 'm', hue: 78, defaults: ['m', 'ft'],
    units: [
      lin('nm', 'Nanometer', 'nm', 1e-9),
      lin('um', 'Micrometer', 'µm', 1e-6),
      lin('mm', 'Millimeter', 'mm', 1e-3),
      lin('cm', 'Centimeter', 'cm', 1e-2),
      lin('m', 'Meter', 'm', 1),
      lin('km', 'Kilometer', 'km', 1e3),
      lin('in', 'Inch', 'in', 0.0254),
      lin('ft', 'Foot', 'ft', 0.3048),
      lin('yd', 'Yard', 'yd', 0.9144),
      lin('mi', 'Mile', 'mi', 1609.344),
      lin('nmi', 'Nautical mile', 'nmi', 1852),
      lin('au', 'Astronomical unit', 'AU', 149597870700),
      lin('ly', 'Light-year', 'ly', 9460730472580800),
    ],
  },
  {
    id: 'mass', name: 'Weight', glyph: 'kg', hue: 30, defaults: ['kg', 'lb'],
    units: [
      lin('mg', 'Milligram', 'mg', 1e-6),
      lin('g', 'Gram', 'g', 1e-3),
      lin('kg', 'Kilogram', 'kg', 1),
      lin('t', 'Metric ton', 't', 1000),
      lin('ct', 'Carat', 'ct', 0.0002),
      lin('oz', 'Ounce', 'oz', 0.028349523125),
      lin('lb', 'Pound', 'lb', 0.45359237),
      lin('st', 'Stone', 'st', 6.35029318),
      lin('ton_us', 'US ton', 'ton', 907.18474),
      lin('ton_uk', 'Imperial ton', 'LT', 1016.0469088),
    ],
  },
  {
    id: 'temperature', name: 'Temperature', glyph: '°', hue: 8, defaults: ['c', 'f'],
    units: [
      fn('c', 'Celsius', '°C', (v) => v, (v) => v),
      fn('f', 'Fahrenheit', '°F', (v) => ((v - 32) * 5) / 9, (v) => (v * 9) / 5 + 32),
      fn('k', 'Kelvin', 'K', (v) => v - 273.15, (v) => v + 273.15),
      fn('r', 'Rankine', '°R', (v) => ((v - 491.67) * 5) / 9, (v) => ((v + 273.15) * 9) / 5),
    ],
  },
  {
    id: 'currency', name: 'Currency', glyph: '$', hue: 145, kind: 'currency', defaults: ['USD', 'EUR'],
    units: [], // filled at runtime from exchange rates
  },
  {
    id: 'volume', name: 'Volume', glyph: 'L', hue: 200, defaults: ['l', 'gal_us'],
    units: [
      lin('ml', 'Milliliter', 'mL', 1e-3),
      lin('cl', 'Centiliter', 'cL', 1e-2),
      lin('l', 'Liter', 'L', 1),
      lin('m3', 'Cubic meter', 'm³', 1000),
      lin('cm3', 'Cubic centimeter', 'cm³', 1e-3),
      lin('tsp', 'Teaspoon (US)', 'tsp', 0.00492892159375),
      lin('tbsp', 'Tablespoon (US)', 'tbsp', 0.01478676478125),
      lin('floz', 'Fluid ounce (US)', 'fl oz', 0.0295735295625),
      lin('cup', 'Cup (US)', 'cup', 0.2365882365),
      lin('pt', 'Pint (US)', 'pt', 0.473176473),
      lin('qt', 'Quart (US)', 'qt', 0.946352946),
      lin('gal_us', 'Gallon (US)', 'gal', 3.785411784),
      lin('gal_uk', 'Gallon (UK)', 'gal UK', 4.54609),
      lin('in3', 'Cubic inch', 'in³', 0.016387064),
      lin('ft3', 'Cubic foot', 'ft³', 28.316846592),
    ],
  },
  {
    id: 'area', name: 'Area', glyph: 'm²', hue: 110, defaults: ['m2', 'ft2'],
    units: [
      lin('mm2', 'Square millimeter', 'mm²', 1e-6),
      lin('cm2', 'Square centimeter', 'cm²', 1e-4),
      lin('m2', 'Square meter', 'm²', 1),
      lin('ha', 'Hectare', 'ha', 1e4),
      lin('km2', 'Square kilometer', 'km²', 1e6),
      lin('in2', 'Square inch', 'in²', 0.00064516),
      lin('ft2', 'Square foot', 'ft²', 0.09290304),
      lin('yd2', 'Square yard', 'yd²', 0.83612736),
      lin('ac', 'Acre', 'ac', 4046.8564224),
      lin('mi2', 'Square mile', 'mi²', 2589988.110336),
    ],
  },
  {
    id: 'speed', name: 'Speed', glyph: 'km/h', hue: 50, defaults: ['kmh', 'mph'],
    units: [
      lin('ms', 'Meter per second', 'm/s', 1),
      lin('kmh', 'Kilometer per hour', 'km/h', 1 / 3.6),
      lin('mph', 'Mile per hour', 'mph', 0.44704),
      lin('kn', 'Knot', 'kn', 1852 / 3600),
      lin('fts', 'Foot per second', 'ft/s', 0.3048),
      lin('mach', 'Mach (sea level)', 'Ma', 340.29),
      lin('c', 'Speed of light', 'c', 299792458),
    ],
  },
  {
    id: 'time', name: 'Time', glyph: 'h', hue: 260, defaults: ['h', 'min'],
    units: [
      lin('ns', 'Nanosecond', 'ns', 1e-9),
      lin('us', 'Microsecond', 'µs', 1e-6),
      lin('ms', 'Millisecond', 'ms', 1e-3),
      lin('s', 'Second', 's', 1),
      lin('min', 'Minute', 'min', 60),
      lin('h', 'Hour', 'h', 3600),
      lin('d', 'Day', 'd', DAY),
      lin('wk', 'Week', 'wk', 7 * DAY),
      lin('mo', 'Month', 'mo', YEAR / 12),
      lin('yr', 'Year', 'yr', YEAR),
      lin('dec', 'Decade', 'dec', 10 * YEAR),
      lin('cen', 'Century', 'c', 100 * YEAR),
    ],
  },
  {
    id: 'data', name: 'Data', glyph: 'GB', hue: 280, defaults: ['gb', 'mb'],
    units: [
      lin('bit', 'Bit', 'b', 1 / 8),
      lin('b', 'Byte', 'B', 1),
      lin('kb', 'Kilobyte', 'KB', 1e3),
      lin('mb', 'Megabyte', 'MB', 1e6),
      lin('gb', 'Gigabyte', 'GB', 1e9),
      lin('tb', 'Terabyte', 'TB', 1e12),
      lin('pb', 'Petabyte', 'PB', 1e15),
      lin('kib', 'Kibibyte', 'KiB', 1024),
      lin('mib', 'Mebibyte', 'MiB', 1024 ** 2),
      lin('gib', 'Gibibyte', 'GiB', 1024 ** 3),
      lin('tib', 'Tebibyte', 'TiB', 1024 ** 4),
    ],
  },
  {
    id: 'datarate', name: 'Data rate', glyph: 'Mbps', hue: 300, defaults: ['mbps', 'mbs'],
    units: [
      lin('bps', 'Bit per second', 'bps', 1),
      lin('kbps', 'Kilobit per second', 'kbps', 1e3),
      lin('mbps', 'Megabit per second', 'Mbps', 1e6),
      lin('gbps', 'Gigabit per second', 'Gbps', 1e9),
      lin('bs', 'Byte per second', 'B/s', 8),
      lin('kbs', 'Kilobyte per second', 'KB/s', 8e3),
      lin('mbs', 'Megabyte per second', 'MB/s', 8e6),
      lin('gbs', 'Gigabyte per second', 'GB/s', 8e9),
    ],
  },
  {
    id: 'energy', name: 'Energy', glyph: 'kJ', hue: 15, defaults: ['kcal', 'kj'],
    units: [
      lin('j', 'Joule', 'J', 1),
      lin('kj', 'Kilojoule', 'kJ', 1e3),
      lin('cal', 'Calorie', 'cal', 4.184),
      lin('kcal', 'Kilocalorie', 'kcal', 4184),
      lin('wh', 'Watt-hour', 'Wh', 3600),
      lin('kwh', 'Kilowatt-hour', 'kWh', 3.6e6),
      lin('ev', 'Electronvolt', 'eV', 1.602176634e-19),
      lin('btu', 'British thermal unit', 'BTU', 1055.05585262),
      lin('ftlb', 'Foot-pound', 'ft·lbf', 1.3558179483314),
    ],
  },
  {
    id: 'power', name: 'Power', glyph: 'W', hue: 60, defaults: ['kw', 'hp'],
    units: [
      lin('w', 'Watt', 'W', 1),
      lin('kw', 'Kilowatt', 'kW', 1e3),
      lin('mw', 'Megawatt', 'MW', 1e6),
      lin('hp', 'Horsepower (mech.)', 'hp', 745.69987158227),
      lin('ps', 'Horsepower (metric)', 'PS', 735.49875),
      lin('btuh', 'BTU per hour', 'BTU/h', 0.29307107),
    ],
  },
  {
    id: 'pressure', name: 'Pressure', glyph: 'psi', hue: 180, defaults: ['bar', 'psi'],
    units: [
      lin('pa', 'Pascal', 'Pa', 1),
      lin('kpa', 'Kilopascal', 'kPa', 1e3),
      lin('mpa', 'Megapascal', 'MPa', 1e6),
      lin('bar', 'Bar', 'bar', 1e5),
      lin('atm', 'Atmosphere', 'atm', 101325),
      lin('psi', 'Pound per sq. inch', 'psi', 6894.757293168),
      lin('mmhg', 'Millimeter of mercury', 'mmHg', 133.322387415),
      lin('inhg', 'Inch of mercury', 'inHg', 3386.389),
    ],
  },
  {
    id: 'angle', name: 'Angle', glyph: '∠', hue: 330, defaults: ['deg', 'rad'],
    units: [
      lin('deg', 'Degree', '°', 1),
      lin('rad', 'Radian', 'rad', 180 / Math.PI),
      lin('grad', 'Gradian', 'gon', 0.9),
      lin('arcmin', 'Arcminute', '′', 1 / 60),
      lin('arcsec', 'Arcsecond', '″', 1 / 3600),
      lin('turn', 'Turn', 'tr', 360),
    ],
  },
  {
    id: 'frequency', name: 'Frequency', glyph: 'Hz', hue: 230, defaults: ['mhz', 'khz'],
    units: [
      lin('hz', 'Hertz', 'Hz', 1),
      lin('khz', 'Kilohertz', 'kHz', 1e3),
      lin('mhz', 'Megahertz', 'MHz', 1e6),
      lin('ghz', 'Gigahertz', 'GHz', 1e9),
      lin('rpm', 'Revolutions per minute', 'rpm', 1 / 60),
    ],
  },
  {
    id: 'fuel', name: 'Fuel economy', glyph: 'mpg', hue: 95, defaults: ['l100', 'mpg_us'],
    units: [
      lin('kml', 'Kilometer per liter', 'km/L', 1),
      fn('l100', 'Liter per 100 km', 'L/100km', (v) => 100 / v, (v) => 100 / v),
      lin('mpg_us', 'Mile per gallon (US)', 'mpg', 0.425143707),
      lin('mpg_uk', 'Mile per gallon (UK)', 'mpg UK', 0.35400619),
    ],
  },
  {
    id: 'force', name: 'Force', glyph: 'N', hue: 350, defaults: ['n', 'lbf'],
    units: [
      lin('n', 'Newton', 'N', 1),
      lin('kn', 'Kilonewton', 'kN', 1e3),
      lin('lbf', 'Pound-force', 'lbf', 4.4482216152605),
      lin('kgf', 'Kilogram-force', 'kgf', 9.80665),
      lin('dyn', 'Dyne', 'dyn', 1e-5),
    ],
  },
  {
    id: 'torque', name: 'Torque', glyph: 'N·m', hue: 40, defaults: ['nm', 'lbft'],
    units: [
      lin('nm', 'Newton-meter', 'N·m', 1),
      lin('lbft', 'Pound-foot', 'lbf·ft', 1.3558179483314),
      lin('lbin', 'Pound-inch', 'lbf·in', 0.112984829),
      lin('kgfm', 'Kilogram-force meter', 'kgf·m', 9.80665),
    ],
  },
  {
    id: 'density', name: 'Density', glyph: 'ρ', hue: 190, defaults: ['kgm3', 'gcm3'],
    units: [
      lin('kgm3', 'Kilogram per m³', 'kg/m³', 1),
      lin('gcm3', 'Gram per cm³', 'g/cm³', 1000),
      lin('gl', 'Gram per liter', 'g/L', 1),
      lin('lbft3', 'Pound per ft³', 'lb/ft³', 16.018463374),
      lin('lbgal', 'Pound per gallon (US)', 'lb/gal', 119.826427),
    ],
  },
  {
    id: 'base', name: 'Number base', glyph: '0x', hue: 160, kind: 'base', defaults: ['dec', 'bin'],
    units: [
      lin('bin', 'Binary', 'base 2', 2),
      lin('oct', 'Octal', 'base 8', 8),
      lin('dec', 'Decimal', 'base 10', 10),
      lin('hex', 'Hexadecimal', 'base 16', 16),
      lin('b36', 'Base 36', 'base 36', 36),
    ],
  },
]

export const RADIX: Record<string, number> = { bin: 2, oct: 8, dec: 10, hex: 16, b36: 36 }

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id)
}

export function convert(cat: Category, value: number, fromId: string, toId: string): number {
  const from = cat.units.find((u) => u.id === fromId)
  const to = cat.units.find((u) => u.id === toId)
  if (!from || !to) return NaN
  return to.fromBase(from.toBase(value))
}

/** Converts a string between radixes using BigInt so large integers stay exact. */
export function convertBase(input: string, fromId: string, toId: string): string {
  const fromR = RADIX[fromId]
  const toR = RADIX[toId]
  const s = input.trim().toLowerCase()
  if (!s) return ''
  const neg = s.startsWith('-')
  const digits = neg ? s.slice(1) : s
  if (!digits) return ''
  let n = 0n
  const R = BigInt(fromR)
  for (const ch of digits) {
    const d = parseInt(ch, 36)
    if (Number.isNaN(d) || d >= fromR) return 'Invalid'
    n = n * R + BigInt(d)
  }
  return (neg && n !== 0n ? '-' : '') + n.toString(toR).toUpperCase()
}

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) return '—'
  if (n === 0) return '0'
  const abs = Math.abs(n)
  if (abs >= 1e15 || abs < 1e-7) {
    return n.toExponential(6).replace(/\.?0+e/, 'e').replace('e+', 'e')
  }
  return new Intl.NumberFormat('en-US', {
    maximumSignificantDigits: 12,
    useGrouping: true,
  }).format(n)
}

/** Plain machine-readable value used when copying to the clipboard. */
export function plainNumber(n: number): string {
  if (!Number.isFinite(n)) return ''
  return String(parseFloat(n.toPrecision(12)))
}
