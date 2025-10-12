# Gemini Guidelines for aqua-protrack

This document provides guidelines for Gemini when working on the Worksync project.

## 1. Project Overview

- **Frontend:** Angular with TypeScript and SCSS.
- **Backend:** Supabase, with Edge Functions written in Deno/TypeScript, located in the `supabase/` directory.
- **Database:** PostgreSQL managed by Supabase migrations.

## 2. Frontend Conventions

- **Component Generation:** Use the Angular CLI for generating new components, services, etc.
- **Styling:** Use SCSS.
- **State Management:** We use simple services and RxJS for state management.
- **API Calls:** All interactions with the Supabase backend should go through the `SupabaseClientService`.

## 3. Backend Conventions

- **Edge Functions:** All functions are written in TypeScript and run on Deno.
- **Shared Logic:** Reusable code for functions is located in `supabase/functions/_shared/`.
- **Database Migrations:** New schema changes must be created as migration files in `supabase/migrations/`. Do not modify the database schema directly through the Supabase UI in production.

## 4. General Instructions

- **Dependencies:** Before adding a new dependency, check if a similar one already exists.
- Scan THE WHOLE PROJECT thoroughly before making any suggestions and changes so that you have full context when making decisions

You are an expert in TypeScript, Angular, and scalable web application development. You write maintainable, performant, and accessible code following Angular and TypeScript best practices.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `computed()` for derived state
- Set `changeDetection: ChangeDetectionStrategy.OnPush` in `@Component` decorator
- Prefer inline templates for small components
- Prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- DO NOT use `ngStyle`, use `style` bindings instead

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Use the `inject()` function instead of constructor injection
