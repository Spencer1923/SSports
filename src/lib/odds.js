// American odds -> decimal odds (what a $1 bet returns, stake included)
export const toDecimal = (ml) => (ml > 0 ? 1 + ml / 100 : 1 + 100 / -ml);

// decimal odds -> American odds (null if there's no profit to price)
export const fromDecimal = (dec) => {
  if (!(dec > 1)) return null;
  return dec >= 2 ? Math.round((dec - 1) * 100) : Math.round(-100 / (dec - 1));
};

// moneyline -> implied probability (still includes the book's margin)
export const impliedProb = (ml) => (ml == null ? null : 1 / toDecimal(ml));

// home win probability with the book's margin (vig) removed
export function marketProb(line) {
  const h = impliedProb(line?.homeML);
  const a = impliedProb(line?.awayML);
  if (h == null || a == null) return null;
  return h / (h + a);
}

const gcd = (a, b) => (b ? gcd(b, a % b) : a);

// shows an American price in the chosen format: american | decimal | fractional | implied
export function fmtOdds(ml, format = "american") {
  if (ml == null || Number.isNaN(Number(ml))) return "—";
  const n = Math.round(Number(ml));
  if (format === "decimal") return toDecimal(n).toFixed(2);
  if (format === "implied") return `${(impliedProb(n) * 100).toFixed(1)}%`;
  if (format === "fractional") {
    const [top, bottom] = n > 0 ? [n, 100] : [100, -n]; // profit : stake
    const g = gcd(top, bottom);
    return `${top / g}/${bottom / g}`;
  }
  return n > 0 ? `+${n}` : `${n}`;
}