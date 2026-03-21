# WorkSync Rebuild & AI Integration Plan

## Phase 1: Security & Data Model Overhaul (Completed)

_Goal: Elevate the backend to production-grade security, specifically addressing the plaintext storage of Clockify API keys and eliminating the EAV (Entity-Attribute-Value) settings table._

- [ ] **Step 1.1: Design Secure Schema:** Replace the generic `settings` table with a strict `user_settings` table. Use native boolean types and strict columns.
- [ ] **Step 1.2: Implement Encryption:** Implement Supabase Vault (or `pgcrypto`/`pgsodium`) to securely encrypt the `clockify_api_key` at rest.
- [ ] **Step 1.3: Update RLS Policies:** Ensure the client can only _write_ or _update_ their API key, but never read the raw key back (write-only from the frontend).
- [ ] **Step 1.4: Refactor Backend Repos:** Update `settings.repo.ts` and related Edge Functions to read/decrypt from the new secure schema.

## Phase 2: Google AI Studio (Gemini) Integration

_Goal: Rip out manual/hardcoded business logic for pacing and suggestions, replacing it with prompt-based, dynamic AI generation using the Gemini API._

- [ ] **Step 2.1: Gemini SDK Setup:** Import and configure the `@google/generative-ai` SDK within the Deno `_shared` utilities.
- [ ] **Step 2.2: Refactor `generate-suggestions`:** Create a strict system prompt that ingests Clockify time entries and outputs a structured Zod-validated JSON array of insights.
- [ ] **Step 2.3: Refactor `create-weekly-summaries`:** Update the weekly cron job to use Gemini to generate the `insightText` instead of the hardcoded `if/else` variance logic.
- [ ] **Step 2.4: Enhance `get-todays-focus` (Optional):** Allow the AI to adjust the required daily pace based on the user's historical peak productivity days.

## Phase 3: Frontend Alignment

_Goal: Connect our freshly cleaned Angular frontend to the new secure, AI-powered backend endpoints._

- [ ] **Step 3.1: Update Settings UI:** Modify the `Settings` component to handle the "write-only" API key flow (e.g., showing a placeholder like `••••••••` if a key exists, instead of populating the input).
- [ ] **Step 3.2: Update Zod Schemas:** Adjust `app.schemas.ts` to perfectly match the new structured JSON payloads coming from the Gemini-powered Edge Functions.
- [ ] **Step 3.3: E2E Verification:** Manually test the full flow (Clockify sync -> Supabase -> Gemini -> Angular UI) to ensure data moves securely and accurately.

## Phase 4: Test-Driven Hardening

_Goal: Lock in the contracts and behavior with rigorous frontend unit tests._

- [ ] **Step 4.1: Setup Test Environment:** Ensure Karma/Jasmine is configured with proper mock providers for Supabase and modern Angular `DestroyRef` contexts.
- [ ] **Step 4.2: Test `Settings` Component:** Write tests verifying that form validation, dirty state, and save payloads work perfectly.
- [ ] **Step 4.3: Test `Dashboard` & `ProjectHistory`:** Mock the new AI payloads and verify that the components render the Zod-validated data correctly.
- [ ] **Step 4.4: Test Shared Utils:** Write pure unit tests for all functions in `date.utils.ts` and `history-view.helper.ts`.
