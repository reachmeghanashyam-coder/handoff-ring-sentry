# Handoff: Commercial Delivery Sentry for Ring Doorbell Pro

> **Build, Ship, Shape: Amazon Developer Hackathon 2026**  
> **Track:** Ring Track ($12,000) & AWS Builder Mini-Challenge ($5,000)  
> **Live Demo:** [https://handoff-ring-sentry.vercel.app](https://handoff-ring-sentry.vercel.app)  
> **Demo Video:** [https://youtu.be/gq-Mb7Lw88I](https://youtu.be/gq-Mb7Lw88I)

---

## 📌 Elevator Pitch
A package can arrive at the right address and still be left in the wrong place. **Handoff** closes the vulnerable last 10 feet between carrier drop-off and front-desk intake for commercial clinics, co-working hubs, and residential suites using Ring Doorbell Pro, automated dwell countdowns, and cryptographically signed legal evidence dossiers.

---

## 🚀 Key Features

1. **Ring Doorbell Live Feed & Intake Detection**
   - Connects to Ring Developer APIs via WebRTC and webhook snapshot feeds.
   - Automatically detects package drop-offs, carrier identity, and placement shelter zones.

2. **Dwell Time & SLA Breach Sentry**
   - Live real-time ticker counts elapsed dwell time outside.
   - Automatically alerts when a package exceeds the safe unattended window (15-min SLA threshold) to prevent porch loss or rain damage.

3. **Front-Desk Custody Handoff**
   - Single-click retrieval confirmation (`Confirm Retrieval`) binding the responsible staff member (`Elena - Front Desk`).
   - Transitions state from "Waiting Outside" to "Safe Pickup Verified".

4. **Cryptographic SHA-256 Legal Evidence Dossier**
   - Instant printable legal report at `/api/tickets/[id]/dossier`.
   - Immutable custody chain, package health verdict (`Seal Intact · Box Undamaged · Contents Received in Good Health`), and SHA-256 audit digest.

---

## 🏗️ Architecture

```
Ring Doorbell Pro / Camera Feed
            │
            ▼
Next.js 15 Backend (`app/api/ring`)
            │
            ├── Real-time Dwell Engine (In-Memory Sentry Store)
            │
            ├── AWS Bedrock & System Auth Integrations
            │
            └── Legal Dossier Generator (SHA-256 Digest)
            │
            ▼
Handoff Cyber-Bento Dashboard (`http://localhost:3001`)
```

---

## 🛠️ Getting Started

### Prerequisites
- Node.js 18+
- npm or pnpm
- (Optional) Ring Developer Playground Token from [developer.amazon.com/ring/console/playground](https://developer.amazon.com/ring/console/playground)

### Installation
```bash
# Clone the repository
git clone <your-repo-url>
cd ring-starter

# Install dependencies
npm install

# Build & Run production server
npm run build
npm run start
```
Open [http://localhost:3001](http://localhost:3001) in your browser.

---

## 📋 Friction Log & Rubric Compliance
Full 6-field rubric friction log available in [`docs/FRICTION_LOG.md`](./docs/FRICTION_LOG.md) covering:
1. Token Expiry & Silent Stream Drop
2. Session CA Certificate Rejections on Windows
3. Webhook Latency vs Real-Time Dwell Sentry SLA

---

## 👥 Hackathon Submission
- **Event:** Build, Ship, Shape: Amazon Developer Hackathon 2026
- **Video Demonstration:** [YouTube (Unlisted)](https://youtu.be/gq-Mb7Lw88I)
