// American odds -> decimal odds (what a $1 bet returns, stake included)
export const toDecimal = (ml) => (ml > 0 ? 1 + ml / 100 : 1 + 100 / -ml);

// decimal odds -> American odds (null if there's no profit to price)
export const fromDecimal = (dec) => {
  if (!(dec > 1)) return null;
  return dec >= 2 ? Math.round((dec - 1) * 100) : Math.round(-100 / (dec - 1));
};

// American odds as text: +150 / -110 / —
export const fmtOdds = (ml) => (ml == null ? "—" : ml > 0 ? `+${ml}` : `${ml}`);