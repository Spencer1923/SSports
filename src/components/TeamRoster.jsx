"use client";
import { useState } from "react";
import Link from "next/link";

// order positions appear in inside each tab (anything not listed goes to the end)
const POSITION_ORDER = [
  "QB", "RB", "FB", "WR", "TE", "LT", "LG", "C", "RG", "RT", "T", "G", "OL",
  "DE", "DT", "NT", "DL", "OLB", "ILB", "MLB", "LB", "CB", "FS", "SS", "S", "DB",
  "PK", "K", "P", "LS", "KR", "PR",
];
const rank = (pos) => {
  const i = POSITION_ORDER.indexOf(pos);
  return i === -1 ? 99 : i;
};

// ESPN's group names ("offense", "defense", "specialTeam") -> tab labels
const unitLabel = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("special")) return "Special Teams";
  return n.charAt(0).toUpperCase() + n.slice(1);
};

export default function TeamRoster({ groups = [], depth, teamColor }) {
  const [tab, setTab] = useState(0); // which unit tab is selected
  const [query, setQuery] = useState(""); // search text

  // units = [{ name: "Offense", players: [...] }, ...]; falls back to one flat list
  const units = groups.some((g) => g.items)
    ? groups.map((g) => ({ name: unitLabel(g.position), players: g.items || [] })).filter((u) => u.players.length)
    : [{ name: "Roster", players: groups }];
  if (!units.length) return null;

  // depth chart: player id -> best depth slot (0 = starter)
  const depthRank = {};
  depth?.depthchart?.forEach((formation) => {
    Object.values(formation.positions || {}).forEach((slot) => {
      (slot.athletes || []).forEach((a, i) => {
        if (depthRank[a.id] === undefined || i < depthRank[a.id]) depthRank[a.id] = i;
      });
    });
  });

  const q = query.trim().toLowerCase();

  // group one unit's players by position: starters first, then by jersey number
  const buildGroups = (players) => {
    const byPos = {};
    players
      .filter((p) => !q || p.displayName?.toLowerCase().includes(q) || String(p.jersey) === q.replace("#", ""))
      .forEach((p) => {
        const pos = p.position?.abbreviation || "—";
        if (!byPos[pos]) byPos[pos] = [];
        byPos[pos].push(p);
      });
    Object.values(byPos).forEach((list) =>
      list.sort(
        (a, b) =>
          (depthRank[a.id] ?? 99) - (depthRank[b.id] ?? 99) ||
          (Number(a.jersey) || 99) - (Number(b.jersey) || 99),
      ),
    );
    return Object.entries(byPos).sort((a, b) => rank(a[0]) - rank(b[0]) || a[0].localeCompare(b[0]));
  };

  // searching looks across all units; otherwise show only the selected tab
  const visible = q ? units : [units[tab] || units[0]];
  const rendered = visible
    .map((u) => ({ ...u, groups: buildGroups(u.players) }))
    .filter((u) => u.groups.length);

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <h2 className="text-xs uppercase tracking-[0.2em] text-gray-400 mr-2">Roster</h2>

        {/* unit tabs */}
        <div className="flex rounded-full border border-white/10 bg-white/5 p-1">
          {units.map((u, i) => (
            <button
              key={u.name}
              onClick={() => {
                setTab(i);
                setQuery("");
              }}
              className={`px-4 py-1 rounded-full text-xs uppercase tracking-widest cursor-pointer transition ${
                !q && tab === i ? "bg-gold text-black font-bold" : "text-gray-400 hover:text-white"
              }`}
            >
              {u.name} <span className="opacity-60">{u.players.length}</span>
            </button>
          ))}
        </div>

        {/* search by name or jersey number */}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find a player or #..."
          className="sm:ml-auto w-full sm:w-56 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-base sm:text-sm text-gray-200 placeholder-gray-500 focus:border-gold/60"
        />
      </div>

      <p className="flex items-center gap-2 text-[11px] text-gray-500 mb-4">
        <span className="w-1.5 h-1.5 rounded-full bg-gold" /> Starter (from the depth chart)
      </p>

      {rendered.length === 0 && <p className="text-sm text-gray-500">No players match {query}.</p>}

      {rendered.map((u) => (
        <div key={u.name} className="mb-6">
          {/* unit label only while searching, since results span all tabs */}
          {q && <p className="text-[11px] uppercase tracking-widest text-gray-500 mb-2">{u.name}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 items-start">
            {u.groups.map(([pos, list]) => (
              <div key={pos} className="card overflow-hidden" style={{ borderTop: `3px solid ${teamColor}` }}>
                <div className="flex items-baseline justify-between bg-white/5 px-3 py-2">
                  <span className="text-sm font-extrabold tracking-wide text-gold">{pos}</span>
                  <span className="text-[11px] tabular-nums text-gray-500">{list.length}</span>
                </div>

                <div className="divide-y divide-white/5">
                  {list.map((p) => {
                    const starter = depthRank[p.id] === 0;
                    return (
                      <Link
                        key={p.id}
                        href={`/players/${p.id}`}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm transition-colors hover:bg-white/5"
                      >
                        <span className="w-8 text-right text-xs tabular-nums text-gray-500">
                          {p.jersey ? `#${p.jersey}` : ""}
                        </span>
                        <span className={starter ? "font-medium text-gray-100" : "text-gray-400"}>
                          {p.displayName}
                        </span>
                        {starter && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-gold" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}