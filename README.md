# NINOFI

**Milestone-based escrow and contracts for home renovation.**

NINOFI is a mobile-first platform for homeowners, contractors, and workers. It combines milestone tracking, digital contracts, messaging, and payout readiness to keep projects transparent and on schedule.

---

## Highlights
- 🔒 **Escrow-ready milestones**: Create, fund (UI), submit, and approve milestones.
- 📸 **Evidence capture**: Photo uploads with submissions.
- 📝 **Contracts**: Create, view, sign, and manage per project.
- 💬 **Messaging & notifications**: In-app chat and alerts.
- 👤 **Role-specific dashboards**: Homeowner, contractor, and worker flows.
- 💰 **Stripe Connect (contractors)**: Required for payout-related flows.

---

## Tech Stack
**Frontend**
- React Native with Expo (Expo Router)
- React Navigation 6.x inside Expo Router tabs
- Redux Toolkit + Redux Persist
- Expo Image Picker, Expo Location, Expo Camera
- Axios (`EXPO_PUBLIC_API_URL` configurable)

**Backend**
- Node.js + Express (`/server`)
- PostgreSQL
- JWT auth
- Stripe Connect onboarding for contractors
- RESTful API (deployed on Railway by default)

---

## Project Structure
```
ninofi/
├── app/                          # Expo Router entry (tabs + modal)
├── src/
│   ├── navigation/               # AppNavigator (React Navigation stack)
│   ├── screens/
│   │   ├── auth/                 # Welcome, login, register, role selection
│   │   ├── homeowner/            # Dashboards, project create/review/fund
│   │   ├── contractor/           # Dashboards, find/apply, submit milestones, contracts
│   │   ├── worker/               # Gigs, assignments, submissions
│   │   └── shared/               # Chat, profile, wallet, notifications, audits
│   ├── components/               # Shared UI components
│   ├── services/                 # API clients (axios), feature service modules
│   ├── store/                    # Redux slices (auth, projects, invoices, notifications)
│   └── styles/                   # palette, theme
├── server/                       # Express API (Railway-ready)
├── package.json
└── README.md
```

---

## Getting Started
### Prereqs
- Node 16+
- npm or yarn
- Expo CLI (bundled via `npx expo`)
- iOS simulator / Android emulator or Expo Go on device

### App
```bash
npm install
npm start   # expo dev server
```
Run: press `i` (iOS), `a` (Android), or scan QR with Expo Go.

### API (optional local)
```bash
cd server
npm install
npm start   # starts Express on PORT (default 8081)
```
Set `EXPO_PUBLIC_API_URL` to your API (e.g., `http://localhost:8081/api` or the Railway URL) and restart the Expo app.

---

## Role Flows
**Homeowner**
- Create project (3-step wizard), set milestones.
- Fund UI, track progress, review/approve submitted milestones.
- Manage contracts and messaging.

**Contractor**
- Browse/apply to projects; chat with owners.
- Submit milestones with evidence; manage contracts.
- Connect Stripe for payouts.

**Worker**
- View assigned gigs/projects.
- Submit work proof; track pending/approved tasks.

---

## Stripe Notes
- Contractor payout-related endpoints require a connected Stripe account.
- Use “Connect Bank” (Stripe Connect onboarding) from the contractor dashboard to clear “Stripe account not connected” responses.

---

## Contributing

**Team Members:**
- **Gurraj Singh** (gsingh62@wisc.edu)
- **Kunal Singh** (kdsingh@wisc.edu) 
- **Arjun Bharadhwaj** (bharadhwaj@wisc.edu) 
- **Rohit Sriram** (rsriram2@wisc.edu) 

---

Built with ❤️ by Team NINOFI.
