# Review Report

## Summary

- Total Issues: 28
- Critical: 1
- High: 5
- Medium: 12
- Low: 6
- Info: 4
- Positive Findings: 12

---

## Issue #1

### Severity

Critical

### Type

Security Vulnerability

### Category

Security  
Authentication

### Location

- File: `src/tokens/tokens.service.ts`
- Class: `TokensService`
- Method / Function: `issueAuthSession`, `refreshToken` (via `hashingService.hash` / `compare` on full JWT refresh tokens)

- File: `src/hashing/bcrypt.service.ts`
- Class: `BcryptService`
- Method / Function: `hash`, `compare`

### Problem

Refresh tokens are full JWTs (typically ~280–340+ characters) and are stored hashed with bcrypt. bcrypt only uses the first **72 bytes** of input and silently truncates the rest.

Empirical verification with this project's JWT shape shows:

- Two successively signed refresh tokens for the same payload (`sub`, `email`, `name`, `role`, `sid`) share a prefix far longer than 72 characters (first difference around index ~266).
- `bcrypt.compare(oldToken, hash(newToken))` returns **`true`**.

That means after rotation, the **previous** refresh token still verifies against the **new** session hash. Intended reuse detection:

```ts
if (!isValid) {
  await this.usersService.revokeRefreshSession(session.id);
}
```

never fires for legitimately rotated sibling tokens of the same session. Refresh-token rotation and theft detection are effectively non-functional.

### Why it matters

Stolen refresh cookies remain valid after the victim refreshes. An attacker who obtained a single refresh JWT can keep minting access tokens for the session lifetime. This is a core authentication control failure, not a theoretical hardening gap.

### Recommendation

Do not bcrypt full JWTs. Hash refresh secrets with a non-truncating digest (for example SHA-256 / HMAC) or store a high-entropy opaque refresh secret (random bytes) and put only a session identifier in the JWT/cookie design. Keep bcrypt/argon2 for passwords only. Add tests that prove an old refresh token fails after rotation.

### References

- OWASP ASVS V3 Session Management  
- OWASP Top 10 A07:2021 Identification and Authentication Failures  
- bcrypt 72-byte input limit (OpenBSD bcrypt / bcryptjs behavior)

---

## Issue #2

### Severity

High

### Type

Bug

### Category

API Design  
Maintainability

### Location

- File: `package.json`
- Method / Function: script `start:prod` → `node dist/main`

- File: `tsconfig.json` / Nest build output
- Actual entry: `dist/src/main.js`

### Problem

`npm run start:prod` requires `dist/main`, but Nest/TypeScript emit the application at `dist/src/main.js`. Loading `dist/main` fails with `MODULE_NOT_FOUND`.

### Why it matters

Production process managers and deploy scripts that use the documented prod script will fail to start the service after a successful build.

### Recommendation

Point `start:prod` at the real compiled entry (`dist/src/main.js`), or adjust Nest/TS `rootDir`/`outDir` so `dist/main.js` is the actual output. Verify with a clean build in CI.

---

## Issue #3

### Severity

High

### Type

Bug

### Category

Authentication  
Security

### Location

- File: `src/auth/auth.controller.ts`
- Class: `AuthController`
- Method / Function: `verifyEmail` (`GET auth/verify-email`)

- File: `src/auth/services/verify-email.service.ts`
- Class: `VerifyEmailService`
- Method / Function: `verifyEmail`

### Problem

Email verification is a **GET** endpoint that performs state changes: marks the user verified, deletes the verification token, and issues an authenticated session (refresh cookie + access token).

Many email clients, corporate gateways, and link scanners prefetch HTTP GET links. Prefetch will:

1. Consume the one-time verification token.
2. Verify the account without the real user completing the flow.
3. Attach the session cookie to the scanner, not the user.
4. Leave the real user with `EMAIL_ALREADY_VERIFIED` and **no** login when they later click the link.

### Why it matters

Broken verification UX in production, accidental session issuance to third-party crawlers, and violation of safe HTTP method semantics for non-idempotent auth actions.

### Recommendation

Use `POST` (or a two-step confirm page that POSTs the token). Do not auto-issue a session on verification if a safer redirect-to-login is acceptable. Avoid side effects on GET.

### References

- RFC 9110 (HTTP Semantics) — safe methods  
- OWASP ASVS Email Verification guidance

---

## Issue #4

### Severity

High

### Type

Bug

### Category

Authentication  
Error Handling

### Location

- File: `src/auth/services/sign-up.service.ts`
- Class: `SignUpService`
- Method / Function: `sendVerificationEmail`

- File: `src/auth/services/forgot-password.service.ts`
- Class: `ForgotPasswordService`
- Method / Function: `sendPasswordResetEmail`

### Problem

Both flows fire-and-forget email delivery and swallow all failures:

```ts
void this.emailService.send(...).catch(() => undefined);
```

The API still returns success messages (`SIGN_UP_SUCCESS`, `FORGOT_PASSWORD_SUCCESS`) even when Resend fails, the API key is wrong, or the network errors.

Additionally, `EmailService.send` only returns a boolean on Resend `error` and does not throw or log; callers ignore that boolean entirely.

### Why it matters

Users cannot complete registration or password reset and receive no signal that email failed. Support load increases; security-sensitive recovery becomes unreliable. Failures are invisible to operators.

### Recommendation

Await send within a controlled path, log failures with correlation IDs, and decide product behavior: fail the request, queue for retry, or return success only after accepted handoff to a durable queue. Never silently discard auth email errors without observability.

---

## Issue #5

### Severity

High

### Type

Security Vulnerability

### Category

Security  
Authentication

### Location

- File: `src/auth/services/forgot-password.service.ts`
- Class: `ForgotPasswordService`
- Method / Function: `forgotPassword`

### Problem

Unknown or unverified emails always receive HTTP 200 and a generic success message. For an existing **verified** user inside the resend cooldown window, the API returns **HTTP 429** with `PASSWORD_RESET_RESEND_COOLDOWN`.

An attacker can probe emails: 429 ⇒ account exists and is verified; 200 with no mail ⇒ absent or unverified.

### Why it matters

Account enumeration enables targeted phishing, credential stuffing prioritization, and privacy leakage.

### Recommendation

Always return the same status and body. Enforce cooldown with a constant-time path (e.g. dummy work / store cooldown by email hash even for unknowns) so responses do not differ by account state.

### References

- OWASP Testing Guide — User Enumeration  
- OWASP ASVS V2 Authentication

---

## Issue #6

### Severity

Medium

### Type

Security Vulnerability

### Category

Security  
Authentication

### Location

- File: `src/auth/services/sign-in.service.ts`
- Class: `SignInService`
- Method / Function: `signIn`

### Problem

Sign-in returns distinct errors:

- Missing user → `INVALID_CREDENTIALS`
- Existing but unverified → `EMAIL_NOT_VERIFIED`
- Wrong password → `INVALID_CREDENTIALS`

That reveals whether an email is registered and whether it is verified.

### Why it matters

Same enumeration class as Issue #5, on a high-traffic public endpoint.

### Recommendation

Use one generic authentication failure for clients. If product requires “verify your email,” gate that message only after successful password check, or accept the tradeoff explicitly and document it—still prefer not to disclose existence before password verification.

---

## Issue #7

### Severity

Medium

### Type

Security Vulnerability

### Category

Security  
Authentication

### Location

- File: `src/auth/services/sign-in.service.ts`
- Class: `SignInService`
- Method / Function: `signIn`

### Problem

When the user is not found, the handler returns immediately without a password hash comparison. When the user exists, it runs bcrypt `compare`. Response timing therefore differs for valid vs invalid emails.

### Why it matters

Remote timing/account enumeration aid for automated probing, especially combined with distinct error messages.

### Recommendation

Always run a password compare against a dummy hash when the user is missing, then return a generic error. Pair with rate limiting (see Issue #25).

### References

- OWASP ASVS V2.2 — General Authenticator Requirements

---

## Issue #8

### Severity

Medium

### Type

Security Vulnerability

### Category

Security

### Location

- File: `src/email/templates/verification.email.ts`
- Class: `VerificationEmail`

- File: `src/email/templates/password-reset.email.ts`
- Class: `PasswordResetEmail`

- File: `src/auth/dtos/sign-up.dto.ts`
- Class: `SignUpDto` (`name` — `@IsString()` only)

### Problem

User-controlled `name` is interpolated directly into HTML email bodies with no encoding:

```ts
const greeting = name ? `Welcome ${name}!` : 'Welcome!';
this.html = `<h2>${greeting} Please verify your email</h2>...`
```

`SignUpDto.name` has no max length, no strip of HTML, and no sanitization.

### Why it matters

Stored HTML injection into outbound email. Depending on the mail client, this can alter message content, phishing presentation, or script/markup behavior in clients that render HTML loosely.

### Recommendation

HTML-escape all dynamic fields in templates, constrain `name` length/charset, and treat email HTML as untrusted-output encoding context.

### References

- OWASP XSS Prevention (output encoding)  
- CWE-79

---

## Issue #9

### Severity

Medium

### Type

Bug

### Category

Validation  
Database

### Location

- File: `src/auth/dtos/sign-up.dto.ts`, `sign-in.dto.ts`, `forgot-password.dto.ts`
- File: `src/users/users.service.ts` — `findByEmail`, `create`
- File: `src/db/schema.ts` — `users.email` unique text column

### Problem

Emails are stored and looked up exactly as submitted. There is no normalization (`trim` / `toLowerCase`). PostgreSQL `text` uniqueness is case-sensitive by default, so `User@Example.com` and `user@example.com` can be two accounts.

### Why it matters

Duplicate identities, broken login for users who vary casing, and weaker uniqueness guarantees for security-sensitive account keys.

### Recommendation

Normalize emails to a canonical form before validation persistence and lookup (typically trim + lowercase for common cases). Enforce uniqueness on the normalized value. Document any intentional exceptions.

---

## Issue #10

### Severity

Medium

### Type

Security Vulnerability

### Category

Security  
Authentication

### Location

- File: `src/tokens/tokens.service.ts`
- Class: `TokensService`
- Method / Function: `refreshToken`

### Problem

Refresh validation and rotation are not atomic with respect to concurrent requests:

1. Read session + bcrypt compare  
2. Later, in a transaction, write a new hash  

Two parallel refreshes with the same token can both pass the compare before either update commits (classic TOCTOU). Combined with Issue #1, concurrency safety is even weaker.

### Why it matters

Under parallel tab refresh or racey clients, session state can diverge; reuse detection is unreliable; stolen-token scenarios are harder to contain.

### Recommendation

After fixing the hash algorithm, perform compare-and-rotate in one transactional update with a predicate on the current hash (or use single-use jti / version column with `UPDATE ... WHERE token_hash = $old`). On mismatch after a prior success, treat as reuse and revoke the session family / all user sessions.

### References

- OWASP ASVS — Session token rotation / reuse detection

---

## Issue #11

### Severity

Medium

### Type

Security Vulnerability

### Category

Security  
Authentication

### Location

- File: `src/tokens/tokens.service.ts`
- Class: `TokensService`
- Method / Function: `setRefreshTokenToCookie`, `clearRefreshTokenCookie`

### Problem

```ts
secure: this.configService.get('NODE_ENV') === 'production'
```

`NODE_ENV` is not defined in the project's `.env` keys (only app/JWT/DB/email/Swagger vars). Unless the host injects `NODE_ENV=production`, refresh cookies are issued **without** the `Secure` flag even on HTTPS deployments.

### Why it matters

Refresh tokens may be sent over cleartext HTTP if any non-TLS endpoint is reachable, defeating cookie security assumptions for session credentials.

### Recommendation

Drive cookie flags from explicit config (e.g. `COOKIE_SECURE=true`) with a production-safe default, and fail closed when deploying public HTTPS. Document required env vars.

### References

- OWASP Session Management Cheat Sheet — Cookie attributes

---

## Issue #12

### Severity

Medium

### Type

Architecture

### Category

Architecture  
NestJS  
Database

### Location

- File: `src/db/index.ts`
- Method / Function: module-level `Pool` / `db` export

- Consumers: services import `db` directly (`sign-up`, `verify-email`, `reset-password`, `tokens`, `seed-roles`, etc.)

### Problem

The database client is a process-global singleton outside Nest dependency injection:

- `process.env.DATABASE_URL!` non-null assertion with no boot validation  
- `drizzle({ client: pool, schema } as any)` erases typing  
- `neonConfig.webSocketConstructor = WebSocket` relies on a global `WebSocket` with no explicit import/polyfill  
- No Nest lifecycle hooks for pool shutdown  
- Hard to mock in unit tests; transactions and services are tightly coupled to the concrete client  

`src/db/relations.ts` defines relations but they are never passed into the Drizzle client.

### Why it matters

Poor testability, weaker compile-time safety, environment footguns at import time, and connection lifecycle issues under reloads or multi-instance boots.

### Recommendation

Provide `DATABASE` via a Nest provider/module, validate env at startup, remove `as any`, wire schema+relations correctly, and close the pool on application shutdown.

---

## Issue #13

### Severity

Medium

### Type

Maintainability

### Category

Maintainability  
Architecture  
NestJS

### Location

- File: `src/users/users.service.ts`
- Class: `UsersService`

### Problem

`UsersService` owns users, roles, email verification tokens, password reset tokens, and refresh sessions (CRUD, revoke, upsert). It is a multi-aggregate repository/god service rather than a focused user domain service.

Also exposes broad helpers (`findAll`, `delete`) unused by controllers, increasing the accidental surface if later wired carelessly (`findAll` returns full rows including `passwordHash`).

### Why it matters

As features grow, this file will become the bottleneck for changes, reviews, and testing. Mixing session storage with user profile operations blurs bounded contexts.

### Recommendation

Split into repositories/services per aggregate (`Users`, `EmailVerificationTokens`, `PasswordResetTokens`, `RefreshSessions`). Keep password hashes out of any list/DTO mapping layer.

---

## Issue #14

### Severity

Medium

### Type

Architecture

### Category

Architecture  
Maintainability

### Location

- File: `src/tokens/tokens.service.ts`  
  imports `generateRandomToken` from `src/auth/utils/token.util`

- Module graph: `TokensModule` is a shared infra module; `AuthModule` depends on tokens

### Problem

Dependency direction is inverted: a lower-level tokens module depends on an auth feature util. This creates coupling and complicates reuse (e.g. other modules needing tokens without pulling auth semantics).

### Why it matters

Layering violations make refactors and circular dependency risk more likely as the codebase grows.

### Recommendation

Move crypto helpers to `common/utils` (or a small `crypto` module) and keep `auth` depending on tokens, not the reverse.

---

## Issue #15

### Severity

Medium

### Type

Bug

### Category

Error Handling  
Logging

### Location

- File: `src/common/filters/http-exception.filter.ts`
- Class: `HttpExceptionFilter`
- Method / Function: `catch`

### Problem

The global `@Catch()` filter converts unknown errors to HTTP 500 with a generic body but **never logs** the original exception, stack, or request id. Operational failures (DB down, unexpected throws from `new Error('Default role "user" is not seeded')`, etc.) are invisible.

### Why it matters

Production incidents cannot be diagnosed from application logs; only clients see `Internal Server Error`.

### Recommendation

Log unexpected errors at `error` level with stack and correlation metadata; keep client responses generic. Prefer Nest `Logger` or a structured logger.

---

## Issue #16

### Severity

Medium

### Type

Bug

### Category

Testing

### Location

- File: `package.json` — `test`, `test:e2e`, `test:cov`  
- File: `.gitignore` — bare pattern `test`  
- Repository: **no** `*.spec.ts` files, **no** `test/jest-e2e.json`, no e2e suite  

### Problem

There are zero automated tests for auth, tokens, hashing, guards, or email flows. The root `.gitignore` entry `test` ignores any path segment named `test`, which also ignores `src/test/` and a conventional root `test/` e2e directory—actively fighting the Nest test layout referenced by scripts.

### Why it matters

Regressions like Issue #1 (broken refresh rotation) can ship unnoticed. Auth systems without tests are high operational risk.

### Recommendation

Fix `.gitignore` (ignore coverage/output, not all `test` paths). Add unit tests for token parse/hash/rotation, sign-in enumeration, reset flow, and e2e happy/sad paths for the auth controller. Make CI fail without them.

---

## Issue #17

### Severity

Medium

### Type

Architecture

### Category

Database  
Maintainability

### Location

- File: `drizzle.config.ts`, `package.json` scripts (`db:generate`, `db:migrate`, `db:push`)
- Repository: no committed `drizzle/` migration artifacts

### Problem

Schema exists in code, but the repo has no versioned migration history checked in. Teams commonly rely on `db:push`, which is unsafe for shared/production databases.

### Why it matters

Schema drift, non-reproducible deploys, and risky production changes without reviewable SQL.

### Recommendation

Generate and commit migrations; apply them in deploy pipelines; reserve `push` for local experiments only.

---

## Issue #18

### Severity

Medium

### Type

Design Issue

### Category

Authorization  
Architecture

### Location

- File: `src/db/seed-roles.ts` — seeds `user` and `admin`  
- File: `src/db/schema.ts` — `roles` / `users.roleId`  
- Codebase: **no** role guard, policy, or authorization check beyond authentication  

### Problem

An `admin` role is part of the data model and JWT payload (`role: string`), but nothing enforces authorization. Role is informational only.

### Why it matters

Creates a false sense of RBAC readiness. Future endpoints may trust `role` from the JWT without re-validation patterns being established. Seeding `admin` without a controlled promotion path is an incomplete security design.

### Recommendation

Either implement real authorization (`RolesGuard`, policies, admin bootstrap process) or remove unused admin seeding until needed. Never trust role solely from a client-controlled claim without server policy.

---

## Issue #19

### Severity

Medium

### Type

Maintainability

### Category

Authentication  
Performance

### Location

- File: `src/tokens/tokens.service.ts`
- Class: `TokensService`
- Method / Function: `issueAuthSession`

### Problem

Session issuance bcrypt-hashes twice per login/verify: once for a random placeholder hash, once for the real refresh token. Refresh itself bcrypt-verifies then bcrypt-hashes again. bcrypt is intentionally slow; using it for high-frequency session tokens is costly and, per Issue #1, incorrect for long inputs.

### Why it matters

Elevated latency on sign-in/refresh under load; unnecessary CPU; wrong tool for the job.

### Recommendation

Use fast cryptographic hashes for session secrets; reserve password KDFs for passwords. Avoid placeholder double-hash if the design can insert the final hash in one step.

---

## Issue #20

### Severity

Low

### Type

Maintainability

### Category

Validation  
Security

### Location

- File: `src/auth/dtos/sign-up.dto.ts`, `reset-password.dto.ts`, `sign-in.dto.ts`
- Validators: `@MinLength(6)` only

### Problem

Password policy is weak (6 characters, no complexity/breach checks). There is no `@MaxLength` despite bcrypt’s 72-byte truncation behavior for passwords longer than that limit.

### Why it matters

Weak passwords increase credential-stuffing success. Overlong passwords silently weaken to a 72-byte prefix under bcrypt.

### Recommendation

Raise minimum length (e.g. 8–12+), add max length aligned with the chosen password hasher, and consider a modern KDF (argon2id) with clear limits. Optionally integrate breached-password checks later.

### References

- OWASP Authentication Cheat Sheet — password strength  
- NIST SP 800-63B (memorized secrets)

---

## Issue #21

### Severity

Low

### Type

Maintainability

### Category

Maintainability  
Readability

### Location

- File: `src/test/test.controller.ts`, `test.service.ts`, `test.module.ts` (gitignored by `test` pattern; not part of git index)
- File: `src/users/users.service.ts` — `findAll`, `delete`, `deleteRefreshSession`
- File: `src/db/relations.ts` (unused by `db` client)
- File: `src/app.controller.ts` / `app.service.ts` — default Hello World
- File: `package.json` — `@nestjs/throttler` dependency unused in code

### Problem

Dead or scaffold code remains in the tree: a manual email “test” endpoint with a hardcoded recipient, unused user methods, unused relations wiring, default Nest hello route, and an installed but unwired throttler package. `@types/bcrypt` is present while the runtime library is `bcryptjs`.

### Why it matters

Noise for reviewers, risk of accidentally exposing debug endpoints if `TestModule` is imported, and dependency hygiene issues.

### Recommendation

Remove dead code and unused dependencies, or isolate dev-only tools behind explicit non-production modules. Align type packages with runtime libraries.

---

## Issue #22

### Severity

Low

### Type

Bug

### Category

API Design  
Documentation

### Location

- File: `src/swagger-setup.ts` — only `addBearerAuth()`
- File: `src/auth/auth.controller.ts` — `@ApiCookieAuth('refresh_token')` on refresh/logout

### Problem

Swagger documents cookie auth for refresh/logout, but the OpenAPI document never registers a cookie security scheme. Cookie-auth “Try it out” will not work as annotated.

### Why it matters

Misleading API docs for the primary refresh mechanism; higher integration friction.

### Recommendation

Register cookie auth in `DocumentBuilder` to match annotations, or drop incorrect decorators.

---

## Issue #23

### Severity

Low

### Type

Bug

### Category

NestJS  
Authentication

### Location

- File: `src/common/guards/access-token.guard.ts`
- Class: `AccessTokenGuard`
- Method / Function: `canActivate`

### Problem

After verifying the JWT, the guard loads the user by **`payload.email`**, not by `payload.sub` (stable user id). It does not assert `payload.sub === user.id`.

### Why it matters

Email is a mutable business attribute (even if mutation is not implemented yet). Looking up by email couples authn to a changeable identifier and skips a cheap integrity check between subject and loaded user.

### Recommendation

Resolve the user by `sub` (primary key). Optionally ensure email/role claims match current DB state if you re-fetch for freshness.

---

## Issue #24

### Severity

Low

### Type

Maintainability

### Category

NestJS  
Architecture

### Location

- File: `src/auth/auth.module.ts` — re-imports `ConfigModule` despite global `ConfigModule.forRoot`  
- File: `src/tokens/tokens.module.ts` — same  
- File: `src/hashing/bcrypt.service.ts` — implements abstract methods with narrower `string` vs `string | Buffer`  
- File: `tsconfig.json` — `noImplicitAny: false`, several strict flags off  

### Problem

Minor Nest/module redundancy and incomplete TypeScript strictness reduce the safety net Nest + TS are meant to provide.

### Why it matters

Low immediate breakage, but weaker long-term correctness guarantees and noisier modules.

### Recommendation

Enable stricter TS settings gradually; rely on global `ConfigModule`; keep provider signatures aligned with abstractions.

---

## Issue #25

### Severity

Info

### Type

Recommendation

### Category

Security  
Performance

### Location

- File: `package.json` — `@nestjs/throttler` present  
- File: `src/app.module.ts` — no `ThrottlerModule` / guard  
- Auth endpoints: `sign-in`, `forgot-password`, `reset-password`, `sign-up`, `refresh` unprotected by application-level rate limits  

### Problem

No application rate limiting is configured. Brute-force and email bombing are constrained only by infrastructure (if any).

### Why it matters

Auth endpoints are high-value abuse targets. Lack of throttling is common at MVP stage but should be planned before public exposure.

### Recommendation

Enable `@nestjs/throttler` (already a dependency) with stricter limits on auth routes, plus IP/user-agent awareness for refresh/forgot-password. Consider CAPTCHA only if abuse appears.

### References

- OWASP ASVS V11 — DoS / rate limiting (defense in depth)

---

## Issue #26

### Severity

Info

### Type

Recommendation

### Category

Documentation  
Security

### Location

- Repository root: no `.env.example`  
- File: `src/main.ts` / services — env vars read ad hoc via `ConfigService` / `process.env`  
- File: `README.md` — stock NestJS starter content only  

### Problem

Required variables (`DATABASE_URL`, JWT secrets, `RESEND_API_KEY`, `APP_URL`, etc.) are not documented for operators. There is no schema validation (`Joi` / `zod` / `@nestjs/config` validation) at boot. `EmailService` constructs `new Resend(apiKey)` which throws if the key is missing—good fail-fast for email, but JWT secrets can still be `undefined` at sign time depending on call path.

### Why it matters

Misconfiguration is a leading cause of auth outages and weak secrets in deployment.

### Recommendation

Add `.env.example`, replace README with project-specific setup, and validate configuration at startup (fail if secrets missing or too short).

---

## Issue #27

### Severity

Info

### Type

Recommendation

### Category

Security  
API Design

### Location

- File: `src/main.ts` — no `enableCors`, no security headers middleware  
- File: `src/swagger-setup.ts` — Swagger mounted unconditionally at `api/docs`  

### Problem

CORS is unset (fine for pure same-origin, broken/insecure-by-default for cookie-based SPA on another origin). Swagger UI is always exposed. No helmet-style headers (optional for pure JSON APIs behind a gateway).

### Why it matters

Browser clients need explicit CORS + credential policy; public Swagger increases attack surface and schema disclosure in production.

### Recommendation

Configure CORS deliberately for known frontends when using cookie refresh. Disable or protect Swagger outside non-production environments.

---

## Issue #28

### Severity

Low

### Type

Design Issue

### Category

API Design  
Authentication

### Location

- File: `src/auth/services/reset-password.service.ts`
- Class: `ResetPasswordService`
- Method / Function: `resetPassword`

- File: `src/tokens/tokens.service.ts` — access tokens are stateless JWTs  

### Problem

Password reset revokes refresh sessions (good) but cannot revoke already-issued access tokens before `JWT_ACCESS_EXPIRES_IN` (15m in local env). No access-token denylist or version/`tokenVersion` claim exists.

### Why it matters

A stolen access token remains valid until expiry after password reset or logout. Acceptable for short-lived access tokens if documented; still a residual risk window.

### Recommendation

Keep access TTL short (already 15m). Optionally embed a password/session version claim checked in the guard, or accept residual risk explicitly in threat model.

---

# Positive Findings

1. **Clear feature-oriented auth services** (`SignUp`, `SignIn`, `VerifyEmail`, `ForgotPassword`, `ResetPassword`, `Logout`) keep the controller thin and readable.
2. **Global `ValidationPipe`** with `whitelist`, `forbidNonWhitelisted`, and `transform` is correctly applied in `main.ts`.
3. **Password and one-time secrets are not stored in plaintext** — passwords use bcrypt; verification/reset tokens store hashes of high-entropy secrets with `id.secret` token format.
4. **Refresh tokens are httpOnly cookies** with `sameSite: 'strict'` — solid cookie baseline (pending Secure flag correctness).
5. **Logout / logout-all and password reset revoke refresh sessions** — session server-side state is a good design for revocation.
6. **Sign-up race handling** for unique email violations (`23505`) is thoughtful and reduces duplicate-account bugs under concurrency.
7. **Forgot-password generic success message** (when not in cooldown) shows awareness of enumeration (undermined by 429 paths).
8. **Hashing abstraction** (`HashingService` + `BcryptService`) is a clean Nest DI pattern for swapping algorithms.
9. **Drizzle schema** is coherent: FKs with `onDelete: 'cascade'`, indexes on token hashes and `userId`, one verification/reset token per user.
10. **Swagger** is wired with bearer auth and operation summaries on auth routes.
11. **Constants** for messages and TTLs improve consistency and i18n readiness.
12. **Transactions** are used for multi-step auth state changes (sign-up, verify, reset, session issue).

---

# Overall Assessment

## Scores (out of 10)

| Area | Score |
|------|-------|
| Architecture | 6.5 |
| Security | 3.5 |
| Performance | 6.0 |
| Maintainability | 6.0 |
| Readability | 7.5 |
| Scalability | 5.5 |
| Testing | 1.0 |
| Documentation | 2.0 |

## Production readiness

**Not ready for production.**

The codebase shows a solid *intent* for modern auth (hashed OTPs, httpOnly refresh cookies, session rows, rotation, email verification, password reset with session revoke). However, the **refresh-token storage design is critically broken** due to bcrypt truncation of JWTs, which nullifies rotation and reuse detection. That alone is a ship blocker for any environment where refresh cookies protect real accounts.

### Must fix before deployment

1. **Replace bcrypt hashing of refresh JWTs** with a non-truncating approach; add tests that old tokens fail after rotation (Issue #1).  
2. **Fix `start:prod` entrypoint** (Issue #2).  
3. **Change email verification off unsafe GET side effects** (Issue #3).  
4. **Stop swallowing auth email failures without observability** (Issue #4).  
5. **Close account enumeration holes** on forgot-password cooldown (and preferably sign-in) (Issues #5–#7).  
6. **Validate required env** (JWT secrets, DB, cookie secure policy) at boot (Issues #11, #26).  
7. **Add automated tests** for auth critical paths (Issue #16).  
8. **HTML-escape email template variables** (Issue #8).  
9. **Normalize emails** (Issue #9).  

### Can improve later

- Rate limiting / abuse controls (Issue #25)  
- Split `UsersService`, DI-wrap DB, migrations discipline (Issues #12–#14, #17)  
- Real RBAC or remove admin seed (Issue #18)  
- CORS/Swagger production hardening (Issue #27)  
- Stronger password policy and modern KDF (Issue #20)  
- Access-token versioning after reset (Issue #28)  
- Project-specific README and `.env.example` (Issue #26)  
- Dead code and dependency cleanup (Issue #21)  

### Bottom line

Treat this as a **promising authentication skeleton**, not a finished security subsystem. Architecture and readability are ahead of security correctness and verification. Approve only after the critical refresh-token hashing defect and other ship blockers above are remediated and covered by tests.
