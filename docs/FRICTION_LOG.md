# Amazon Ring Developer Platform Friction Log
## Product Feedback & Developer Experience Report

> **Hackathon Track:** Ring Track — Build, Ship, Shape: Amazon Developer Hackathon 2026  
> **Project:** Handoff (Commercial Delivery Exception & Chain-of-Custody Sentry)  
> **Developer Environment:** Windows 11 / Node.js 20 / Next.js 14 / WebRTC (WHEP)

---

### 1. Executive Summary & Context
During the implementation of **Handoff**, our team integrated the official **Ring Developer Playground**, WebRTC live video streaming (`WHEP` protocol at `api.amazonvision.com`), and REST endpoints (`/v1/devices`, `/v1/events/history`). 

Overall, the new developer portal represents a massive leap forward by transforming Ring from a closed consumer doorbell into an extensible IoT platform. However, building an active commercial exception engine exposed several key points of developer friction that, if addressed, will dramatically accelerate third-party ecosystem adoption.

---

### 2. Concrete Developer Friction Points & Recommendations

#### **Friction 1: Short-Lived Playground Access Token Expiration in Development**
* **The Experience:** The Ring Developer Playground provides an access token for instant API exploration. However, during active application development and local testing sessions, the short token lifespan requires frequent manual copying/pasting from the browser console back into `.env.local`.
* **Developer Impact:** Disrupts local development loops and causes abrupt WebRTC stream disconnects during live end-to-end testing.
* **Suggested Solution:** 
  1. Introduce a configurable *"Developer Sandbox Token"* with a 24-hour expiration option directly inside the Playground UI.
  2. Provide a lightweight CLI command (e.g. `ring playground login --sandbox`) that automatically writes the active session token to local `.env`.

#### **Friction 2: WebRTC (WHEP) Session Termination Visibility**
* **The Experience:** Starting a live stream via WHEP (`POST /v1/devices/{id}/media/streaming/whep/sessions`) with an SDP offer is clean. However, when a simulated stream ends or when a client encounters an ICE network renegotiation, the endpoint returns silent disconnects or `404 Not Found` upon session teardown (`DELETE`) without descriptive error payloads.
* **Developer Impact:** Applications must implement defensive polling and heuristic reconnection wrappers to distinguish between carrier network drops and stream simulator completion.
* **Suggested Solution:** Standardize WebRTC session health webhooks or SSE error frames (e.g., `STREAM_COMPLETED_NORMALLY`, `ICE_TIMEOUT`, `CONCURRENT_STREAM_LIMIT_REACHED`).

#### **Friction 3: Differentiating Between Residential and Commercial Sensor Scopes**
* **The Experience:** The Ring Developer Portal's recent introduction of dynamic scopes (`sensors_read`, `cameras_read`) is a huge architectural improvement. However, in the Playground simulator, simulated events are primarily centered around residential scenarios (doorbell ring, package delivery, backyard motion).
* **Developer Impact:** Commercial workflows (such as dual-sensor physical air-locks combining contact sensors on business doors with entryway cameras) require manual mock scaffolding in the simulator.
* **Suggested Solution:** Expand the Ring Developer Playground simulator with multi-device scenarios (e.g., *"Package Drop at Door + Front Door Contact Sensor Cycle"*).

---

### 3. Conclusion & Positive Highlights
Despite the friction points above, the official [`AmazonAppDev/ring-api-helloworld`](https://github.com/AmazonAppDev/ring-api-helloworld) baseline provided an exceptional starter foundation. The ability to test live WebRTC video feeds in browser environments without requiring physical hardware allowed our team to design, build, and deploy an enterprise-grade commercial receiving sentry in under 24 hours.
