# Ring Developer Platform — Friction Log

**Hackathon:** Build, Ship, Shape: Amazon Developer Hackathon 2026  
**Track:** Ring Track  
**Project:** Handoff — Delivery Exception Management  
**Environment:** Windows 11, Node.js 20, Next.js 15, Ring Developer Playground, WebRTC (WHEP)

---

## Context

While building **Handoff**, our team integrated the Ring Developer Playground and the official Ring API sample application (`AmazonAppDev/ring-api-helloworld`) to explore device data, delivery history events, and live video streaming. The platform gave us a practical starting point for building a delivery-management workflow around Ring devices.

Below are the specific areas where we encountered friction during development, structured strictly around observed behavior and actionable suggestions for the Amazon Ring developer team.

---

## Friction 1: Playground access tokens interrupt local development loops

* **Task attempted:** Run the Ring API sample locally and test device queries and live video feeds repeatedly during application development.
* **Steps:** 
  1. Generate an access token in the Developer Playground console.
  2. Paste it into `.env.local` as `RING_ACCESS_TOKEN`.
  3. Start the Next.js local development server (`npm run dev`).
  4. Test device discovery (`/v1/devices`) and start a live stream.
  5. Continue developing and debugging UI components for more than 30 minutes.
* **Expected:** A continuous local development session where API requests remain authenticated while actively coding.
* **Observed:** As documented in the sample repository, Playground tokens expire after approximately 30 minutes. Once expired, all API requests return `401 Unauthorized`, and WebRTC stream negotiation fails. To resume work, the developer must leave the code editor, open the Playground tab, generate a new token, edit `.env.local`, and restart the local server or refresh the app.
* **Severity:** Medium — highly disruptive to flow during extended development and debugging sessions.
* **Workaround:** We added a client-side token input modal directly in the Handoff dashboard navigation bar, allowing a fresh token to be pasted and injected into runtime request headers without restarting the server.
* **Suggested improvement:** Provide a dedicated developer CLI helper (e.g. `ring login --sandbox`) that automatically refreshes the local token, or offer a configurable 12-to-24 hour sandbox development token option in the Playground console with appropriate non-production rate limits.

---

## Friction 2: Node.js fetch TLS validation on Windows for Ring API endpoints

* **Task attempted:** Query device history events from a Next.js server route running on Windows 11 using Node 20's native `fetch`.
* **Steps:** 
  1. Set up a Next.js App Router API route (`/api/ring/events/route.ts`).
  2. Make a server-side `fetch('https://api.amazonvision.com/v1/history/devices/...', { headers: { Authorization: `Bearer ${token}` } })`.
  3. Run the development server on Windows 11 with Node.js v20.18.0.
* **Expected:** Successful HTTPS JSON response from `api.amazonvision.com`.
* **Observed:** The request failed with a `TypeError: fetch failed` caused by `UNABLE_TO_GET_ISSUER_CERT_LOCALLY` in Node’s `undici` TLS handshake on Windows, because the intermediate CA bundle was not resolved automatically in the Windows Node runtime environment.
* **Severity:** Medium — can cause new developers on Windows to believe the API endpoint is down or that their token is rejected.
* **Workaround:** Configured a custom `undici` agent dispatcher in the server-side API client or set the development environment certificate authority pool to recognize the Amazon Trust Services root.
* **Suggested improvement:** Add a brief troubleshooting note in the sample repository's `README.md` addressing Windows developers using Node 18/20+, clarifying the recommended TLS agent setup or environment flag for local development.

---

## Friction 3: History endpoint route discrepancy between documentation and implementation

* **Task attempted:** Retrieve recorded motion and delivery event history for a device.
* **Steps:** 
  1. Consulted the starter documentation which suggested querying `/v1/devices/{deviceId}/events`.
  2. Executed a `GET` request with a valid bearer token.
* **Expected:** A JSON array of historical event objects.
* **Observed:** The endpoint returned `403 Forbidden` / `404 Not Found`. After inspecting network traffic from the Playground web console, we discovered the working production endpoint is `/v1/history/devices/{deviceId}/events`.
* **Severity:** Low to Medium — costs developer exploration time when getting started.
* **Workaround:** Updated the internal route handler URL to `/v1/history/devices/${deviceId}/events`.
* **Suggested improvement:** Update the quickstart documentation and SDK type definitions to consistently reference `/v1/history/devices/{deviceId}/events` so developers don't have to inspect browser network calls to verify the route.

---

## What Worked Well

* **Clear Sample Foundation:** The `AmazonAppDev/ring-api-helloworld` repository provided a very clean, straightforward starting point for WebRTC SDP exchange and browser video playback.
* **Browser-Based Streaming:** The ability to negotiate WHEP streams directly with `api.amazonvision.com` in standard browser environments without requiring custom native binary plugins made prototyping fast and accessible.
* **Playground Device Simulators:** Being able to generate simulated motion and delivery events allowed us to build and verify end-to-end exception workflows without needing physical hardware installed at a front door during late-night development.

I would build with Ring again. Exploring how Ring devices can move beyond simple home video monitoring into active delivery exception management proved that the platform has genuine potential for business and institutional workflows.
