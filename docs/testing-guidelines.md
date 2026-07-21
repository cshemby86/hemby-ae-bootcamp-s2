# Testing Guidelines

## Principles

- Use a layered testing strategy: unit, integration, and end-to-end (E2E).
- All tests must be isolated and independent.
- Every test should set up its own required data and state.
- Setup and teardown hooks are required so tests succeed reliably across repeated runs.
- All new features must include appropriate tests.
- Tests should be maintainable, readable, and aligned with best practices.

## Unit Tests

- Framework: Use Jest to test individual functions and React components in isolation.
- Naming convention: `*.test.js` or `*.test.ts`.
- Backend location: `packages/backend/__tests__/`.
- Frontend location: `packages/frontend/src/__tests__/`.
- File naming: Name unit test files to match what they test.
- Example: `app.test.js` for `app.js`.

## Integration Tests

- Framework: Use Jest and Supertest to test backend API endpoints with real HTTP requests.
- Location: `packages/backend/__tests__/integration/`.
- Naming convention: `*.test.js` or `*.test.ts`.
- File naming: Use clear names based on the endpoint or behavior under test.
- Example: `todos-api.test.js` for TODO API endpoint coverage.

## End-to-End (E2E) Tests

- Framework: Use Playwright as the required E2E framework.
- Scope: Test complete UI workflows through browser automation.
- Location: `tests/e2e/`.
- Naming convention: `*.spec.js` or `*.spec.ts`.
- File naming: Name files by user journey.
- Example: `todo-workflow.spec.js`.
- Browser policy: Playwright tests must use one browser only.
- Architecture: Playwright tests must use the Page Object Model (POM) pattern for maintainability.
- Coverage limit: Limit E2E coverage to 5-8 critical user journeys, focused on happy paths and key edge cases.

## Port Configuration

- Always use environment variables with sensible defaults for port configuration.
- Backend port standard:

```js
const PORT = process.env.PORT || 3030;
```

- Frontend port standard: React default is 3000 and can be overridden by the `PORT` environment variable.
- CI/CD compatibility: Environment-driven ports are required so workflows can dynamically detect and assign ports.

## Quality and Reliability Rules

- Tests must not depend on execution order.
- Avoid hidden shared state between tests.
- Keep assertions specific and behavior-focused.
- Prefer stable selectors and deterministic test data in UI tests.
- Refactor brittle tests promptly to preserve trust in the test suite.