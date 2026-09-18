# MediKiosk — Unified SIH Architecture

MediKiosk uses two independent dashboards with one central backend and one Firestore database.

- Patient dashboard: http://localhost:3000
- Doctor dashboard: http://localhost:3001
- Unified backend: http://localhost:5000

## Run

1. Copy `.env.example` to `.env` and fill in Firebase/Sarvam/Gemini configuration.
2. Run `npm install` at the repository root.
3. Run `npm run dev`.

Both dashboards proxy `/api/*` to the same backend at port 5000. The backend is the source of truth for shared patient, report, prescription, consultation and notification state. SSE endpoints provide live dashboard updates.

## Production note

Before production use, implement Firebase Authentication token verification, role-based authorization, restrictive Firestore/Storage security rules, secure secret management, audit logging, and appropriate healthcare/privacy controls. The included prototype data/auth behavior is not production clinical security.
