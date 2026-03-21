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

## Phase 3: Backend Structural Refactor & Test Hardening

_Goal: Reorganize the backend into a strict, scalable microservice architecture and update all backend tests to cover the new AI integration._

- [ ] **Step 3.1: Strict Environment Configs:** Implement `_shared/configs/env.ts` with `getEnvOrThrow` pattern.
- [ ] **Step 3.2: Reorganize `_shared` Directory:** Group files cleanly into `configs`, `helpers`, `repo`, `services`, `tests`, `types`, and `utils`.
- [ ] **Step 3.3: Refactor Edge Functions:** Flatten `controllers/` into `orchestrator.ts` and standardize the internal directory structure (`services`, `repo`, `tests`, `types`) across all functions.
- [ ] **Step 3.4: Fix & Update Backend Tests:** Rewrite unit tests for `suggestions`, `todays-focus`, and `weekly-summaries` to correctly mock the Gemini SDK and ensure behavior is locked in.

## Phase 4: Frontend Alignment

_Goal: Connect our freshly cleaned Angular frontend to the new secure, AI-powered backend endpoints._

- [ ] **Step 4.1: Update Settings UI:** Modify the `Settings` component to handle the "write-only" API key flow.
- [ ] **Step 4.2: Update Zod Schemas:** Adjust `app.schemas.ts` to match the AI-generated structured outputs.
- [ ] **Step 4.3: E2E Verification:** Manually test the full flow (Clockify -> Supabase -> Gemini -> Angular).

## Phase 5: Test-Driven Hardening (Frontend)

_Goal: Lock in the contracts and behavior with rigorous frontend unit tests._

- [ ] **Step 5.1: Setup Test Environment:** Ensure Karma/Jasmine is configured with proper mock providers.
- [ ] **Step 5.2: Test `Settings` Component:** Verify write-only API key logic.
- [ ] **Step 5.3: Test `Dashboard` & `ProjectHistory`:** Mock the new AI payloads.
- [ ] **Step 5.4: Test Shared Utils.**
