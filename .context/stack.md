# Stack Decisions

Canonical technology choices for each output type. These are not preferences — they are decisions.
Agents use this file to select libraries, tools, and configurations. Do not deviate without updating this file and documenting the rationale.

---

## Output Type: `web-saas`

### Core Stack

| Layer               | Choice                                    | Version              |
| ------------------- | ----------------------------------------- | -------------------- |
| Framework           | Next.js (App Router)                      | 15.x                 |
| Language            | TypeScript                                | 5.x (`strict: true`) |
| Styling             | Tailwind CSS                              | 4.x                  |
| Component Library   | shadcn/ui                                 | latest               |
| Backend / Auth / DB | Supabase                                  | latest               |
| Deployment          | Vercel                                    | —                    |
| ORM / Query         | Supabase JS SDK + raw SQL via supabase-js | —                    |
| Validation          | Zod                                       | 3.x                  |
| Testing (unit)      | Vitest + React Testing Library            | latest               |
| Testing (E2E)       | Playwright                                | latest               |
| A11y testing        | axe-core via `@axe-core/playwright`       | latest               |
| Error monitoring    | Sentry                                    | latest               |
| Logger              | Pino                                      | latest               |
| Linter              | ESLint (flat config)                      | 9.x                  |
| Formatter           | Prettier                                  | 3.x                  |
| Package manager     | pnpm                                      | latest               |

### Rationale

- **Next.js 15 App Router**: Server Components enable zero-JS rendering by default; React Server Actions reduce API boilerplate; first-class Vercel integration.
- **TypeScript strict**: Strict mode catches null/undefined bugs that are the #1 cause of runtime errors in JS. Non-negotiable — all agents must use `strict: true`.
- **Tailwind CSS 4.x**: Design-token-based CSS, JIT compilation, excellent shadcn/ui compatibility. Utility-first scales better than CSS Modules for AI-generated code.
- **shadcn/ui**: Not a dependency — it's copied source code. Accessible components (Radix UI primitives), fully customisable, no version lock-in. Meets WCAG AA by default.
- **Supabase**: Postgres + Auth + Storage + Realtime in one managed service. RLS enforces access control at the DB layer — no app-layer guard can bypass it. Free tier is generous for prototypes.
- **Vercel**: Zero-config Next.js deployments, Edge Network, automatic preview URLs per PR. CI/CD integration is one `vercel.json` file.
- **Zod**: Runtime schema validation that matches TypeScript types. Single source of truth for input shapes.
- **Playwright**: Full-stack E2E testing, cross-browser, integrates with axe-core for a11y audits in the same test run.
- **pnpm**: Faster than npm/yarn, strict symlink isolation prevents phantom dependency bugs.

### Project Structure

```
my-product/
├── app/                   # Next.js App Router pages and layouts
│   ├── (auth)/            # Route groups
│   ├── api/               # Route handlers
│   └── layout.tsx
├── components/
│   ├── ui/                # shadcn/ui components (copied)
│   └── [feature]/         # Feature-specific components
├── lib/
│   ├── supabase/          # Supabase client (server + browser)
│   ├── validations/       # Zod schemas
│   └── utils.ts
├── types/                 # Shared TypeScript types
├── supabase/
│   ├── migrations/        # SQL migration files
│   └── seed.sql
├── tests/
│   ├── e2e/               # Playwright tests
│   └── unit/              # Vitest unit tests
├── .github/workflows/     # CI/CD
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── vercel.json
```

---

## Output Type: `android`

### Core Stack

| Layer           | Choice                                    | Version       |
| --------------- | ----------------------------------------- | ------------- |
| Language        | Kotlin                                    | 2.x           |
| UI Framework    | Jetpack Compose                           | latest stable |
| Design System   | Material 3                                | latest        |
| Architecture    | MVVM + Clean Architecture (UseCase layer) | —             |
| Local DB        | Room                                      | 2.x           |
| Networking      | Retrofit + OkHttp                         | latest        |
| Serialisation   | kotlinx.serialization                     | latest        |
| DI              | Hilt                                      | latest        |
| Image Loading   | Coil 3                                    | latest        |
| Async           | Kotlin Coroutines + Flow                  | latest        |
| Testing (unit)  | JUnit 5 + MockK + Turbine                 | latest        |
| Testing (UI)    | Compose Testing + Espresso                | latest        |
| CI/CD           | Fastlane                                  | latest        |
| Linter/Static   | detekt + ktlint                           | latest        |
| Crash reporting | Firebase Crashlytics                      | latest        |

### Rationale

- **Kotlin**: Null-safe by design, coroutines are first-class, officially supported by Google. No Java for new code.
- **Jetpack Compose**: Declarative UI eliminates XML layouts. State-driven rendering is predictable and testable. Material 3 provides accessible defaults.
- **MVVM + Clean Architecture**: ViewModel survives configuration changes, UseCase layer keeps business logic framework-free and testable. Repository pattern abstracts data sources.
- **Room**: Type-safe SQLite abstraction. Compile-time query validation prevents runtime SQL errors. Flow integration with Compose is seamless.
- **Retrofit**: De facto HTTP client for Android. Strongly typed API interfaces, Kotlin coroutine support, easy mocking.
- **Hilt**: Official Android DI framework. Reduces boilerplate vs Dagger 2, integrates with ViewModel and WorkManager.
- **Fastlane**: Automates signing, building, and uploading to Play Store. Reproducible across CI.
- **detekt + ktlint**: Static analysis + formatting. Enforced in CI; block merges on violations.

### Project Structure

```
app/
├── src/main/
│   ├── java/com/company/product/
│   │   ├── data/
│   │   │   ├── local/         # Room DAOs, entities, database
│   │   │   ├── remote/        # Retrofit interfaces, DTOs
│   │   │   └── repository/    # Repository implementations
│   │   ├── domain/
│   │   │   ├── model/         # Domain models (pure Kotlin)
│   │   │   ├── repository/    # Repository interfaces
│   │   │   └── usecase/       # Use case classes
│   │   ├── presentation/
│   │   │   ├── ui/            # Compose screens and components
│   │   │   ├── viewmodel/     # ViewModels
│   │   │   └── navigation/    # NavHost and routes
│   │   └── di/                # Hilt modules
│   └── res/
├── src/test/                  # Unit tests
├── src/androidTest/           # Instrumented tests
├── fastlane/
│   ├── Fastfile
│   └── Appfile
└── build.gradle.kts
```

---

## Output Type: `n8n`

### Core Stack

| Layer           | Choice                                         |
| --------------- | ---------------------------------------------- |
| Runtime         | n8n (self-hosted or n8n.cloud)                 |
| Schema          | n8n Workflow JSON v1                           |
| Custom Nodes    | n8n Community Nodes (npm)                      |
| Credentials     | n8n Credentials store (never in workflow JSON) |
| Version Control | n8n Git integration or exported JSON in repo   |

### Rationale

- **n8n**: Code-optional automation platform. Visual workflow editor accelerates iteration. JSON workflow export enables version control and AI-driven generation.
- **Community Nodes**: Extend n8n without forking the core. Published to npm, installable in self-hosted n8n.
- **Credentials in n8n store**: Credentials are attached to workflow nodes by reference (credential ID), never embedded in the JSON blob. This means exported workflow JSON is safe to commit.

### Workflow JSON Structure

Every workflow JSON must include:

```json
{
  "name": "Workflow name",
  "nodes": [...],
  "connections": {...},
  "settings": {
    "executionOrder": "v1"
  },
  "staticData": null,
  "tags": []
}
```

---

## Output Type: `microcontroller`

### Core Stack

| Layer               | Choice                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| Language            | C (bare-metal) or C++ (SDK APIs)                                          |
| Build System        | CMake 3.x                                                                 |
| Platform SDKs       | ESP-IDF (ESP32), Pico SDK (RP2040), STM32 HAL, Arduino (prototyping only) |
| Static Analysis     | cppcheck + clang-tidy                                                     |
| Formatting          | clang-format                                                              |
| Testing             | Unity test framework (unit, on host)                                      |
| Debugging           | OpenOCD + GDB                                                             |
| OTA (if applicable) | Platform-native OTA (ESP-IDF OTA, Nordic DFU)                             |

### Rationale

- **C/C++**: No other language has the ecosystem depth and vendor SDK support for microcontrollers. C++ is used where RAII and class abstractions improve safety; pure C where code size is critical.
- **CMake**: Platform-agnostic build system. Supported by all major MCU toolchains (ESP-IDF wraps it, Pico SDK requires it, STM32CubeIDE exports it).
- **cppcheck + clang-tidy**: Static analysis catches buffer overflows, null pointer dereferences, and undefined behaviour before hardware testing.
- **Unity**: Lightweight C test framework that runs on the host machine. Tests hardware-independent logic (parsers, state machines, algorithms) without needing a device.

### File Structure

```
firmware/
├── CMakeLists.txt
├── src/
│   ├── main.c
│   ├── [module].c / [module].h
├── include/
├── test/
│   ├── test_[module].c
│   └── unity/
├── platform/              # Platform-specific BSP code
└── docs/
    └── wiring.md
```

---

## Output Type: `cli-tool`

### Core Stack — Default (Go)

| Layer             | Choice                                    | Version |
| ----------------- | ----------------------------------------- | ------- |
| Language          | Go                                        | 1.23+   |
| CLI Framework     | Cobra                                     | 1.x     |
| Configuration     | Viper                                     | 1.x     |
| Output formatting | `github.com/charmbracelet/lipgloss` (TUI) | latest  |
| Distribution      | GitHub Releases + GoReleaser              | latest  |
| Testing           | `testing` stdlib + `testify`              | latest  |
| Linter            | golangci-lint                             | latest  |

### Core Stack — Performance-critical (Rust)

| Layer             | Choice                                    | Version |
| ----------------- | ----------------------------------------- | ------- |
| Language          | Rust                                      | stable  |
| CLI Framework     | clap (derive API)                         | 4.x     |
| Error handling    | `anyhow` (apps) / `thiserror` (libraries) | latest  |
| Serialisation     | serde + serde_json / serde_yaml           | latest  |
| Async (if needed) | tokio                                     | latest  |
| Distribution      | GitHub Releases + `cargo-dist`            | latest  |
| Testing           | Rust `#[test]` + `assert_cmd` for CLI     | latest  |
| Linter            | clippy (deny warnings)                    | —       |

### Decision Rule: Go vs Rust

- **Use Go** (default): File processing, API clients, DevOps tools, database utilities, anything that calls external services. Go's compilation speed, standard library, and goroutines are excellent for these use cases.
- **Use Rust**: Cryptography, binary parsing, performance-sensitive data transformation, tools that process >100MB of data. Rust's zero-cost abstractions and memory safety without GC win here.
- When in doubt, choose **Go**. It's faster to iterate with and produces smaller binaries on most platforms.

### Rationale

- **Cobra**: Standard Go CLI library. Subcommand structure, auto-generated help, shell completion out of the box.
- **GoReleaser / cargo-dist**: Single command produces cross-platform binaries (Linux amd64/arm64, macOS, Windows) and creates GitHub Releases with checksums. No manual build matrix.
- **GitHub Releases**: Distribution platform that requires no infrastructure. Users download pre-built binaries or install via `brew`, `apt`, `scoop`.

### Distribution Checklist

- Binary names follow `tool-name` (Go) or `tool-name` (Rust) conventions.
- Include `--version` flag that prints semantic version.
- GitHub Release assets include SHA256 checksums file.
- Homebrew tap formula (optional, for macOS users).
- Man page generated from Cobra/clap (optional).

---

## Cross-Cutting: CI/CD Principles

Regardless of output type, CI/CD must:

1. **Fail fast**: Linting runs before tests; tests run before deployment.
2. **No secrets in CI YAML**: All secrets via CI platform secret store (GitHub Actions secrets, etc.).
3. **Reproducible builds**: Lock files committed (`pnpm-lock.yaml`, `go.sum`, `Cargo.lock`).
4. **Preview environments**: Web-saas products get a Vercel preview URL per PR.
5. **Automated dependency updates**: Dependabot or Renovate enabled in every repo.
6. **Branch protection**: Main branch requires passing CI before merge.
