# Pilotd

**Social platform where members can discover, log, rate, and discuss worldwide TV shows and streaming series.**

Live: [pilotd.pages.dev](https://pilotd.pages.dev)


---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, Vite, Tailwind CSS |
| Backend | Supabase (PostgreSQL, Edge Functions, Auth, Storage) |
| AI Recommender Agent | Gemini 3.1 Flash-Lite via Supabase Edge Function (Deno) |
| Rate Limiting | Upstash Redis — atomic per-user RPM + RPD limits |
| Media Data | TMDB API |
| Deployment | Cloudflare Pages |
| Design | Figma |

---

## Features

### Media Discovery
- Full TMDB integration — browse, search, and filter the entire TV catalogue by genre, streaming service, rating, and year
- Show detail pages with full information and community reviews
- Trending and personalised discovery feeds on the homepage

### Show Tracking
- Three state tracking per show: **Watched**, **Watching**, **Watchlist**
- Season and episode progress tracking for shows currently watching
- Diary view of watched history grouped by month with filtering and sorting
- Up to 4 pinned favourite shows displayed on member public profile

### Ratings and Reviews
- Star rating system
- Written reviews per show with inline editing
- Community review section on each show's detail page with likes and threaded comments

### AI Recommendation Agent
- Conversational TV recommendation agent powered by **Gemini 3.1 Flash-Lite**
- Multi-turn conversation with full history
- Aware of the user's watched list for new recommendations
- Secured behind Supabase JWT auth for registered members only
- Rate limited per user via **Upstash Redis** (atomic RPM + RPD counters with TTL)
- Works through **Supabase Edge Function**
- Alternate self-hosted version built with **Ollama, n8n,** and **Docker** for local/private deployment

### Social Media
- Public profile pages with full profile editing and settings
- Follow and unfollow members
- Activity and notification feeds

### Auth
- Email/password authentication via Supabase Auth
- Protected routes, session persistence, and password reset flow
- Row-level security on all database tables

---

## Architecture Notes

**Scalability** — Current architecture runs on Supabase + Gemini + Cloudflare free tiers, designed to scale with tier upgrades with minimal to no architectural changes.

---

## Roadmap

- [ ] Live chat between members during show airings
- [ ] Real-time episode release notifications
- [ ] List sharing and collaborative watchlists

---

## Screenshots

<br/>
<img width="1259" height="782" alt="Screenshot 2026-07-07 at 3 04 35 PM" src="https://github.com/user-attachments/assets/1680f9cd-456e-4b82-9077-72305db485d5" />
<br/>
<br/>
<br/>
<img width="1242" height="641" alt="Screenshot 2026-07-07 at 3 10 04 PM" src="https://github.com/user-attachments/assets/3e372227-a061-408e-9ffc-eb3824068a9a" />
<br/>

---

## Author

Built by **Jason Nguyen**



