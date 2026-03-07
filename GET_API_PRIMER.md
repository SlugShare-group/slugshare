# GET API Primer

Last updated: 2026-02-16

## Purpose

This document explains how to integrate with a GET-style backend for:

- account linking
- session authentication
- barcode payload retrieval
- balance-drop-driven fulfillment confirmation

This is intentionally implementation-agnostic so it can be reused for a clean rebuild.

## Core Concepts

### GET services

Most GET integrations expose logical service groups:

- `authentication`
- `user`
- `commerce`

Calls are usually JSON-based RPC-style methods, not REST resources.


### Device credentials

A generated `deviceId` + `PIN` pair owned by your app and tied to the user’s GET account.

### Barcode payload

A raw string from GET that is rendered into a **PDF417 barcode** on the client.

## Authentication Model

## 1) Linking (one-time setup)

1. User completes GET validation flow and provides a validated URL or token.
2. Backend extracts a session identifier from that URL/token.
3. Backend creates device credentials in GET.
4. Backend verifies those credentials by authenticating once.
5. Backend stores device credentials encrypted at rest.

## 2) Runtime authentication

1. Backend authenticates with GET using device credentials.
2. Backend receives a short-lived session token.
3. Backend uses that session for downstream GET calls.
4. Backend caches session briefly and refreshes on expiry/error.

## 3) Demo authentication

For demos/testing, bypass stored credentials and supply temporary auth per request:

- session token / validated URL directly, or
- deviceId + PIN headers

No persistent credential storage is required in demo mode.

## Request and Response Pattern

Common RPC envelope pattern:

- Request body: `method` + `params`
- Response body: either `response` or `exception`

Integration best practices:

- treat `exception` as a typed error
- normalize external errors into internal categories
- retry only transient failures

## Error Categories

Use consistent error buckets:

- `authentication_error`: invalid/expired credentials
- `authorization_error`: user not allowed to access resource
- `transient_upstream_error`: timeout/temporary failure
- `validation_error`: malformed inputs
- `internal_error`: unexpected server issue

## Retry Strategy

Recommended defaults:

- retry transient upstream errors only
- 2-3 retries max
- short exponential or linear backoff
- no retries for validation/auth failures


## Barcode Generation Flow

1. Backend requests current barcode payload from GET.
2. Client receives payload string.
3. Client renders payload as PDF417.
4. Client supports:
   - manual refresh
   - auto-refresh timer
   - visible "last fetched" timestamp

The integration may call this “QR” in product language, but payload rendering is PDF417.

## Fulfillment Flow (Code-Based)

Typical flow:

1. Donor accepts request in code fulfillment mode.
2. Backend records code issue time and expiry.
3. Requester opens scan screen and polls for scan state.
4. Backend returns one of:
   - `active` (payload available)
   - `completed`
   - `unavailable`
5. On first successful code display, backend captures a **baseline balance**.
6. On subsequent polls, backend reads current balance and compares it to baseline.
7. If balance has dropped, request is marked as completed.

Notes:

- Balance drop detection should be tied to the expected account/tender scope.
- This approach avoids transaction-history dependencies but can produce false positives if unrelated spending occurs during the scan window.

## Recommended API Surface (App-Level)

- `GET /get/status`
  - linked state, default mode, last validation
- `POST /get/connect`
  - link account using validated URL/token
- `POST /get/disconnect`
  - unlink account and revoke remote device when possible
- `GET /get/barcode`
  - fetch latest payload for rendering
- `GET /get/testing` (optional)
  - diagnostics endpoint for accounts, payload, and balance monitoring

## Security Requirements

- store GET secrets only server-side
- encrypt credentials at rest with authenticated encryption
- rotate encryption key with migration strategy
- never log raw deviceId, PIN, or session token
- strictly separate demo mode and production mode
- rate-limit auth and scan endpoints

## Observability Requirements

Track at minimum:

- GET auth success/failure rate
- barcode fetch latency/error rate
- balance-read latency/error rate
- fulfillment completion lag
- retry counts and final failure causes

## Production Readiness Checklist

1. Credential encryption and key management finalized.
2. Auth/session retry policy validated under load.
3. Scan-state logic tested for false positives/duplicates.
4. Feature flags in place for safe rollout.
5. Audit logs and alerting configured.
