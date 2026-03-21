# WorkSync Rebuild & AI Integration Plan

## Phase 1: Security & Data Model Overhaul (✅ COMPLETED)

_Goal: Elevate the backend to production-grade security, specifically addressing the plaintext storage of Clockify API keys._

- [x] **Step 1.1: Design Secure Schema**
- [x] **Step 1.2: Implement Encryption (Supabase Vault)**
- [x] **Step 1.3: Update RLS Policies**
- [x] **Step 1.4: Refactor Backend Repos**

## Phase 2: Google AI Studio (Gemini) Integration (✅ COMPLETED)

_Goal: Rip out manual business logic for pacing and suggestions, replacing it with prompt-based dynamic AI generation._

- [x] **Step 2.1: Gemini SDK Setup**
- [x] **Step 2.2: Refactor `generate-suggestions`**
- [x] **Step 2.3: Refactor `create-weekly-summaries`**
- [x] **Step 2.4: Enhance `get-todays-focus`**

## Phase 3: Backend Structural Refactor & Test Hardening (✅ COMPLETED)

_Goal: Reorganize the backend into a strict, scalable microservice architecture and update all backend tests to cover the new AI integration._

- [x] **Step 3.1: Strict Environment Configs:** Implement `_shared/configs/env.ts` with `getEnvOrThrow` pattern.
- [x] **Step 3.2: Reorganize `_shared` Directory:** Group files cleanly into `configs`, `helpers`, `repo`, `services`, `tests`, `types`, and `utils`.
- [x] **Step 3.3: Refactor Edge Functions:** Flatten `controllers/` into `orchestrator.ts` and standardize the internal directory structure across all functions.
- [x] **Step 3.4: Fix & Update Backend Tests:** Rewrite unit tests for `suggestions`, `todays-focus`, and `weekly-summaries` to correctly mock the Gemini SDK.

## Phase 4: Frontend Alignment (✅ COMPLETED)

_Goal: Connect our freshly cleaned Angular frontend to the new secure, AI-powered backend endpoints._

- [x] **Step 4.1: Update Settings UI:** Modify the `Settings` component to handle the "write-only" API key flow and live-state syncing.
- [x] **Step 4.2: Update Zod Schemas:** Adjust `app.schemas.ts` to strictly match the AI-generated structured JSON outputs.
- [x] **Step 4.3: Cost & Performance Optimization:** Implement 1-hour RxJS caching for AI Insights and visibility polling for Clockify syncs.

## Phase 5: Test-Driven Hardening (Frontend) (✅ COMPLETED)

_Goal: Lock in the contracts and behavior with rigorous frontend unit tests and CI/CD automation._

- [x] **Step 5.1: Setup Test Environment:** Organize all `.spec.ts` files into strict domain-driven `tests/` folders.
- [x] **Step 5.2: Test `Settings` & `Suggestions` Services:** Verify write-only API key logic and TTL caching behaviors.
- [x] **Step 5.3: Test UI Components:** Mock Supabase endpoints to prevent Auth Lock crashes in headless environments.
- [x] **Step 5.4: CI/CD Automation:** Deploy GitHub Actions workflows to automate Deno and Angular testing on all Pull Requests.
