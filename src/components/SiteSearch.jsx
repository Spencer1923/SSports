"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { TEAM_IDS, TEAM_LOGOS } from "@/lib/divisions";
import TeamLogo from "@/components/TeamLogo";

// one entry per team, built once from divisions.js
const TEAMS = Object.keys(TEAM_IDS).map((name) => ({ name, id: TEAM_IDS[name], logo: TEAM_LOGOS[name] }));

export default function SiteSearch() {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();

  // match any part of the team name, show at most 6
  const teams = q ? TEAMS.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 6) : [];

  // players come from the search route; wait 300ms after typing stops so we don't call it on every key
  const [players, setPlayers] = useState([]);
  useEffect(() => {
    if (q.length < 2) return;
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setPlayers(d.players || []))
        .catch(() => setPlayers([]));
    }, 300);
    return () => clearTimeout(timer); // cancel if the user keeps typing
  }, [q]);
  // hide stale results when the box is empty or too short
  const shownPlayers = q.length >= 2 ? players : [];

  return (
    <div className="relative w-37 sm:w-64">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search..."
        className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-1 text-base text-gray-200 placeholder-gray-500 focus:border-gold/60 sm:py-1.5 sm:text-sm"
      />

      {/* results dropdown, only shown while typing */}
      {q && (
        <div className="card absolute right-0 z-20 mt-2 w-72 overflow-hidden divide-y divide-white/5 sm:w-80" style={{ background: "#0b0b0b" }}>
          {teams.map((t) => (
            <Link key={t.id} href={`/teams/${t.id}`} onClick={() => setQuery("")} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
              <TeamLogo src={t.logo} alt={t.name} size={28} className="h-6 w-6 sm:h-7 sm:w-7" />
              {t.name}
            </Link>
          ))}
          {shownPlayers.map((p) => (
            <Link key={p.id} href={`/players/${p.id}`} onClick={() => setQuery("")} className="flex items-center gap-3 px-3 py-2 text-sm text-gray-200 hover:bg-white/5">
              <TeamLogo src={p.headshot} alt={p.name} size={28} className="h-6 w-6 rounded-full bg-white/5 object-cover object-top sm:h-7 sm:w-7" />
              <span className="min-w-0 flex-1 truncate">{p.name}</span>
              <span className="shrink-0 text-xs text-gray-500">
                {p.pos} · {p.team}
              </span>
            </Link>
          ))}
          {teams.length === 0 && shownPlayers.length === 0 && <p className="px-3 py-2 text-sm text-gray-500">No results.</p>}
        </div>
      )}
    </div>
  );
}
