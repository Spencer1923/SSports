# 🏈 SSports

A full-stack NFL companion site: live scores, standings, team and player stats, game analysis, a playoff simulator with Monte Carlo odds, betting odds, news, transactions, and a hand-written blog for weekly power and MVP rankings.

**[Live Demo](https://s-sports.netlify.app/)** · **[GitHub](https://github.com/Spencer1923/SSports)**

## What I Built

SSports is a Next.js app that consumes ESPN's public API through its own API routes, which proxy, trim, and cache the data. Every team, player, and game has its own page, and the interactive tools (playoff simulator, odds board, bet slip) run on the client.

**Highlights:**

- Live scoreboard with week navigation, smart polling (fast only while games are live), and score-change animations
- Game pages with box scores, live field graphic, drives, scoring summary, betting lines, head-to-head history, and an interactive win probability chart that labels the "Play of the Game"
- Team pages with schedule, roster with depth chart, and past-season records
- Playoff simulator: pick any remaining game and watch both conferences reseed with NFL-style tiebreakers and remaining strength of schedule
- Monte Carlo playoff odds (2,000 simulated seasons, weighted by betting lines) for division, bye, and playoff chances
- "What needs to happen" tool showing the results a team needs to make the playoffs, win its division, or get the #1 seed
- Betting odds board with spreads, moneylines, totals, market signals, model-vs-market edges, odds-format toggle, and a parlay bet slip
- Weekly MDX blog with power and MVP rankings, including movement arrows versus the previous week
- Fully responsive, with skeleton loading states on every page

## Screenshots

![Homepage](./screenshots/home.jpg)
![Standings](./screenshots/standing.jpg)
![Playoffs](./screenshots/playoffs.jpg)
![Playoff Predictor](./screenshots/playoff-predict.jpg)
![Odds Simulator](./screenshots/odds-sim.jpg)
![Playoff Path Simulator](./screenshots/need-happen.jpg)
![Team Page](./screenshots/team.jpg)
![Live Game Page](./screenshots/live-game.jpg)
![Win Probability](./screenshots/win-prob.jpg)
![Box Score](./screenshots/box-score.jpg)
![Player Bio](./screenshots/bio.jpg)
![League Leaders](./screenshots/leaders.jpg)
![Betting](./screenshots/betting.jpg)
![Bet Slip](./screenshots/bet-slip.jpg)
![Injuries](./screenshots/injuries.jpg)
![Team Stats](./screenshots/teamstats.jpg)
![Blog](./screenshots/blog.jpg)

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack) and React 19 with the React Compiler
- **Styling:** Tailwind CSS 4 with a custom gold/crimson theme
- **Data:** ESPN's public API, reshaped by internal API routes
- **Client data:** SWR with conditional polling, preloading, and `keepPreviousData`
- **Content:** MDX blog posts parsed with `gray-matter` and `next-mdx-remote`
- **Performance:** CDN cache headers by data type, trimmed responses, `next/image` logos, lazy-loaded sections, and a Web Worker for simulations
- **Deployment:** Netlify

## Features

| Page                  | Description                                                                                                     |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `/`                   | Live scoreboard, latest articles, and NFL news                                                                  |
| `/standings`          | AFC/NFC standings by division                                                                                   |
| `/playoffs`           | Pick-the-winners simulator, projected seeds, strength of schedule, Monte Carlo odds, and "what needs to happen" |
| `/leaders`            | League leaders in passing, receiving, rushing, interceptions, and sacks                                         |
| `/team-stats`         | Team leaderboards with bars scaled to the league leader                                                         |
| `/teams/[teamId]`     | Schedule, roster with depth chart, and past-season records                                                      |
| `/players/[playerId]` | Player bio, season stats, and league ranks                                                                      |
| `/games/[gameId]`     | Box score, live drives, scoring, odds, last meetings, and win probability                                       |
| `/injuries`           | League-wide injury report with search and team filter                                                           |
| `/betting`            | Odds board, market signals, edge board, and bet slip                                                            |
| `/news`               | NFL news feed                                                                                                   |
| `/transactions`       | Recent league transactions                                                                                      |
| `/blog`               | Weekly power rankings and MVP rankings                                                                          |
| `/blog/[slug]`        | Individual article with ranking movement                                                                        |

Internal API routes under `/api` cover scores, standings, leaders, team stats, injuries, news, transactions, betting, playoff data, history, head-to-head, and team/player/game data.

## Getting Started

```bash
git clone https://github.com/Spencer1923/SSports.git
cd SSports
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What I Learned

ESPN's API is undocumented, so I learned to handle inconsistent data shapes, missing fields, and an 11 MB injuries feed that Next's data cache can't hold. I cut load times by caching at the CDN by data type and by trimming responses. I measured the results with Lighthouse and brought LCP from 9.0 s to 1.6 s on Netlify. On the feature side, I built the NFL tiebreaker seeding logic, a Web Worker Monte Carlo simulator, a win-probability chart with football-aware "Play of the Game" scoring, and betting math for parlays and implied odds.
