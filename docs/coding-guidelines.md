# Coding Guidelines

This document defines the coding style and quality principles for the TODO app project. Its purpose is to keep the codebase consistent, easy to read, simple to maintain, and safe to evolve as new features are added.

## Style and Formatting

Code should be written in a clean, predictable style so any team member can quickly understand and modify it. Prefer small, focused functions and straightforward control flow over clever patterns.

Formatting should be enforced automatically with project tooling rather than by manual effort. Keep line length reasonable, use consistent indentation, and avoid unused code. Comments should explain intent when the reason for a decision is not obvious from the code itself.

## Naming and Readability

Names should be descriptive and domain-focused. Variables, functions, and components should communicate purpose clearly without requiring extra context.

Use consistent naming patterns across frontend and backend code. Avoid cryptic abbreviations unless they are widely understood in the domain. Prioritize readability over brevity.

## Import Organization

Imports should be organized in a stable, readable order:

1. Built-in or platform modules.
2. Third-party dependencies.
3. Internal project modules.
4. Relative imports within the same feature.

Within each group, keep imports alphabetized when practical. Remove unused imports promptly. Prefer explicit imports over wildcard usage to improve clarity and tooling support.

## Linting and Static Analysis

Linting is required and should run in local development and CI. Treat linter feedback as part of normal development, not optional cleanup.

Rules should emphasize correctness, consistency, and maintainability. If a rule is disabled, the reason should be documented. Avoid broad suppressions and scope any exceptions as narrowly as possible.

## Quality Principles

### DRY (Don't Repeat Yourself)

Duplicate logic should be extracted into shared utilities, hooks, or modules when repetition starts to appear. Reuse should improve clarity; avoid over-abstraction when duplication is small and temporary.

### Single Responsibility

Each module, function, and component should have a clear responsibility. Keep UI rendering, business logic, and data access concerns separated.

### Simplicity First

Prefer simple implementations that are easy to test and reason about. Add complexity only when there is a clear requirement.

### Defensive Coding

Validate inputs at boundaries, handle errors explicitly, and fail with useful messages. Avoid silent failures that make debugging harder.

## Testing and Code Changes

Code changes should include tests appropriate to the change type and risk level. New features and bug fixes should include tests that demonstrate expected behavior.

When changing existing behavior, update tests to reflect the intended outcome. Keep tests readable and deterministic so they remain reliable over time.

## Frontend and Backend Consistency

Frontend and backend should follow the same quality standards even if framework details differ. Shared conventions around naming, folder structure, and error handling reduce onboarding time and improve collaboration.

When introducing a new pattern, apply it consistently within a feature and document it if it affects team-wide development.

## Maintainability Expectations

Refactor opportunistically when touching nearby brittle code, but keep changes scoped and reviewable. Prefer incremental improvements over large rewrites unless a rewrite is explicitly planned.

Code reviews should focus on correctness, clarity, test coverage, and long-term maintainability. The goal is not only to make code work now, but to keep future development safe and efficient.