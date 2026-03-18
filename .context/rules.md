# Governance Rules

These rules are non-negotiable. Every agent in the factory reads this file before generating any code.
Gate checks enforce these rules mechanically — not by LLM judgment.

---

## 1. Security

### 1.1 Secrets Management
- **Never** write secrets, API keys, tokens, passwords, or connection strings in any source file.
- All secrets must live in environment variables, referenced via `process.env.VARIABLE_NAME`.
- Always provide `.env.example` with placeholder values (e.g., `SUPABASE_URL=https://your-project.supabase.co`).
- Add `.env`, `.env.local`, `.env.production` to `.gitignore` unconditionally.
- For mobile apps: secrets go in CI/CD environment variables, not in `local.properties` or `gradle.properties`.
- For microcontrollers: credentials are flashed separately; never in firmware source.

### 1.2 Input Sanitisation
- All user-supplied input must be validated at the boundary (API route, form handler, CLI argument parser).
- Use a validation library: `zod` (TypeScript/Next.js), `kotlinx.serialization` constraints (Android), `cobra` validators (Go CLI).
- Never pass unsanitised user input to database queries; always use parameterised queries or an ORM.
- Never interpolate user input into shell commands.

### 1.3 Transport Security
- HTTPS only in production. HTTP is not acceptable for any data endpoint.
- Set `Strict-Transport-Security` header with `max-age=31536000; includeSubDomains`.
- No `http://` URLs in code — only `https://` or relative paths.

### 1.4 HTTP Security Headers
Every web product must set these headers (via Next.js `next.config.ts` or middleware):
```
Content-Security-Policy: default-src 'self'; script-src 'self' 'nonce-{nonce}'; ...
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
```
CSP must be nonce-based, never `unsafe-inline` or `unsafe-eval` in production.

### 1.5 Dependency Security
- Run `npm audit --audit-level=high` as part of every gate check.
- Zero high or critical vulnerabilities allowed to pass the gate.
- Pin major versions in `package.json`; do not use `*` or `latest`.
- Review `npm audit` output before each release.

### 1.6 OWASP Top 10 Essentials
The following must be addressed in every web-saas product:

| Risk | Required Control |
|------|-----------------|
| A01 Broken Access Control | RLS policies on every Supabase table; server-side auth checks on every route |
| A02 Cryptographic Failures | Never store plaintext passwords; use Supabase Auth; HTTPS enforced |
| A03 Injection | Parameterised queries; zod validation; no string SQL concatenation |
| A04 Insecure Design | Threat model reviewed in spec validation; RLS default-deny |
| A05 Security Misconfiguration | CSP headers; no debug endpoints in production; no stack traces to client |
| A06 Vulnerable Components | `npm audit` gate; Dependabot enabled in GitHub repo |
| A07 Auth Failures | Supabase Auth; JWT verification server-side; no client-trust auth |
| A08 Software Integrity | Lock files committed; CI verifies checksums |
| A09 Logging Failures | Error monitoring (Sentry or equivalent) configured; no sensitive data in logs |
| A10 SSRF | Validate and allowlist any external URLs fetched server-side |

### 1.7 Rate Limiting
- API routes that accept unauthenticated input must be rate-limited.
- Use Vercel Edge Middleware or `upstash/ratelimit` for Next.js.
- Rate limit login/auth endpoints specifically (max 10 attempts per 15 minutes per IP).

---

## 2. Accessibility (A11y)

Every web product must meet WCAG 2.1 Level AA. This is verified by axe-core in the gate.

### 2.1 Semantic HTML
- Use correct HTML elements for their semantic purpose: `<nav>`, `<main>`, `<header>`, `<footer>`, `<section>`, `<article>`, `<button>`, `<a>`.
- Never use `<div>` or `<span>` as interactive elements without role + keyboard support.
- Heading hierarchy must be logical: one `<h1>` per page, no skipped levels.
- Form inputs must have associated `<label>` elements (not just placeholder text).

### 2.2 Colour Contrast
- Text contrast ratio ≥ 4.5:1 against its background (normal text, WCAG AA).
- Large text (≥18pt or ≥14pt bold) contrast ratio ≥ 3:1.
- UI component contrast (borders, focus rings) ≥ 3:1.
- Never use colour as the only means of conveying information.
- Configure Tailwind palette to meet these ratios; verify with axe-core.

### 2.3 Keyboard Navigation
- All interactive elements are reachable and operable by keyboard alone.
- Tab order matches visual/logical reading order.
- Custom interactive components (dropdowns, modals, comboboxes) must implement WAI-ARIA authoring patterns.
- Modal dialogs must trap focus while open and return focus on close.
- Skip-to-main-content link as first focusable element on every page.

### 2.4 ARIA
- Use ARIA only when native HTML semantics are insufficient.
- Every icon-only button must have `aria-label`.
- Dynamic content regions that update must use `aria-live="polite"` (or `assertive` for alerts).
- Never set `aria-hidden="true"` on visible, meaningful content.
- Status messages (toasts, alerts) must be in an ARIA live region.

### 2.5 Images and Media
- All `<img>` elements must have `alt` attribute.
- Decorative images: `alt=""`.
- Informative images: descriptive `alt` text.
- Video content must have captions if required by spec.

### 2.6 Mobile / Responsive
- Touch targets ≥ 44×44 CSS px.
- Viewport meta tag must include `width=device-width, initial-scale=1`.
- No horizontal scroll on standard viewports (320px–2560px).

---

## 3. Code Quality

### 3.1 TypeScript
- `strict: true` in `tsconfig.json` — no exceptions.
- `noImplicitAny: true`, `strictNullChecks: true`, `noUncheckedIndexedAccess: true`.
- No `@ts-ignore` or `@ts-nocheck` in production code. If unavoidable (e.g., third-party library gap), add a comment explaining why and open a ticket.
- Explicit return types on all exported functions.
- Use `unknown` instead of `any` when type is genuinely unknown.

### 3.2 No Production Console Output
- `console.log`, `console.warn`, `console.error` are forbidden in production code.
- Use a structured logger (e.g., `pino`, `winston`) configured to suppress output below `error` level in production.
- ESLint rule `no-console` is set to `error` in `.eslintrc`.

### 3.3 Function Size
- Functions must be ≤ 30 lines of code (excluding blank lines and comments).
- If a function exceeds 30 lines, split it. No exceptions.
- This applies to all languages: TypeScript, Kotlin, Go, C++.

### 3.4 Test Coverage
- Business logic (calculation, validation, state transitions, data transformation) must have unit tests.
- Minimum: test happy path + one error/edge path per function.
- Test files live next to the file they test: `foo.ts` → `foo.test.ts`.
- Use the framework specified in `governance/stack.md` for the product type.
- E2E tests cover the primary user journeys defined in spec.md.

### 3.5 Error Handling
- All async operations must have explicit error handling (try/catch or `.catch()`).
- Never swallow errors silently.
- User-facing error messages must be generic (do not expose stack traces or internal details).
- Log full error details server-side to the error monitoring service.

### 3.6 File and Module Organisation
- One primary export per file.
- No circular dependencies.
- `import` paths are explicit (no barrel re-exports that hide complexity).
- Co-locate: component + its test + its styles (if any) in the same directory.

### 3.7 Commit Hygiene
- Use Conventional Commits format: `type(scope): description`
- Valid types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `perf`, `ci`, `scaffold`, `gate`, `spec`
- Commits are atomic: one logical change per commit.
- Never commit directly to `main`/`master` without a passing gate.

---

## 4. Operational Rules

### 4.1 No Production Touches Without Explicit Confirmation
- The factory never runs database migrations on production schemas without an explicit human confirmation step.
- The factory never deploys to production without Phase 7 human checkpoint.
- The factory never mutates data in any environment without a migration file being written first.

### 4.2 Spec is Law
- No feature is implemented that is not in spec.md.
- No feature in spec.md is skipped without updating spec.md to mark it out-of-scope.
- If scope changes mid-build, stop, update spec.md, commit "spec: update scope", then resume.

### 4.3 Gate Cannot Be Skipped
- Phase 5 gate checks are run by real tools (tsc, eslint, npm audit, axe-cli, playwright).
- LLM judgment does not substitute for tool output.
- A gate result of FAIL means the product does not ship.

### 4.4 Greenfield First
- Each version (v1, v2, v3) is a new product directory, not an incremental mutation of the previous.
- Learnings from v1 are captured in feedback and incorporated into v2's spec.
- This prevents accumulation of technical debt across versions.
