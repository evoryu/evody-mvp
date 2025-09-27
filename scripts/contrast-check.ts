// Simple contrast checker for semantic tokens defined in globals.css
// Usage: npx ts-node scripts/contrast-check.ts (if ts-node installed) or compile via tsc.
// Calculates WCAG 2.1 contrast ratios between text tokens and background/surface tokens.

interface TokenGroup {
  backgrounds: Record<string, string>
  texts: Record<string, string>
}

// Extracted from globals.css (light mode first). If tokens change, update here or build a parser.
const light: TokenGroup = {
  backgrounds: {
    'c-bg': '#ffffff',
    'c-bg-subtle': '#f9fafb',
    'c-surface': '#ffffff',
    'c-surface-alt': '#f6f6f7'
  },
  texts: {
    'c-text': '#111827',
    'c-text-secondary': '#4b5563',
    'c-text-muted': '#6b7280',
    'c-text-disabled': '#9ca3af'
  }
}

const dark: TokenGroup = {
  backgrounds: {
    'c-bg': '#09090b', // zinc-950
    'c-bg-subtle': '#18181b', // zinc-900
    'c-surface': '#18181b',
    'c-surface-alt': '#27272a'
  },
  texts: {
    'c-text': '#fafafa',
    'c-text-secondary': '#a1a1aa', // zinc-400 approx -> using actual hex
    'c-text-muted': '#71717a', // zinc-500
    'c-text-disabled': '#52525b' // zinc-600
  }
}

function srgbChannel(c: number) {
  const cs = c / 255
  return cs <= 0.03928 ? cs / 12.92 : Math.pow((cs + 0.055) / 1.055, 2.4)
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const v = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  const int = parseInt(v, 16)
  return [(int >> 16) & 255, (int >> 8) & 255, int & 255]
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex)
  const R = srgbChannel(r)
  const G = srgbChannel(g)
  const B = srgbChannel(b)
  return 0.2126 * R + 0.7152 * G + 0.0722 * B
}

function contrast(a: string, b: string): number {
  const L1 = relativeLuminance(a)
  const L2 = relativeLuminance(b)
  const brightest = Math.max(L1, L2)
  const darkest = Math.min(L1, L2)
  return (brightest + 0.05) / (darkest + 0.05)
}

function evaluate(ratio: number) {
  // For normal text: AA >= 4.5, AAA >= 7
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA Large (>=18pt or 14pt bold)'
  return 'Fail'
}

function run(label: string, group: TokenGroup) {
  console.log(`\n=== ${label.toUpperCase()} MODE ===`)
  const results: { text: string; bg: string; ratio: number; level: string }[] = []
  for (const [tName, tHex] of Object.entries(group.texts)) {
    for (const [bName, bHex] of Object.entries(group.backgrounds)) {
      const ratio = contrast(tHex, bHex)
      results.push({ text: tName, bg: bName, ratio, level: evaluate(ratio) })
    }
  }
  // Sort by weakest contrast first
  results.sort((a, b) => a.ratio - b.ratio)
  for (const r of results) {
    console.log(`${r.text} on ${r.bg}: ${r.ratio.toFixed(2)} (${r.level})`)
  }
}

run('light', light)
run('dark', dark)

// Potential follow-ups (printed for guidance):
console.log('\nHints: If muted/disabled fail on subtle surfaces, consider darkening text or lightening background slightly.')
