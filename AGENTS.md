# AGENTS.md

## Operating mode
Work toward completing the task without unnecessary planning.
Prefer delivering working code over discussion.

Do not take destructive or irreversible actions unless the user
explicitly requested them.

## Safety
- Do not modify files outside the repository.
- Do not modify `.git/` or rewrite history.
- Assume network access may be unavailable.
- Add or upgrade dependencies only if explicitly requested.

## Instruction priority
Resolve conflicts using this order:

1. Current task prompt
2. Explicit work specification
3. README.md
4. Other documentation

Follow the highest-priority instruction.

## Scope
Implement only the requested task.

Do not introduce new tooling, scaffolding, scripts, or processes unless
explicitly requested.

## Editing
Prefer small, reviewable diffs.

Avoid rewriting entire files unless the file is small or a rewrite is
clearly simpler and safer.

## Design decisions
When multiple reasonable implementations exist:

- briefly identify alternatives
- choose the clearly best option
- state the reason

If no clear choice exists, pause and ask the user.

## Testing
When fixing bugs, add a regression test when feasible.
if there are separate subsystems such as frontend and backend, have tests in all subsystems.

Run tests relevant to the changed behavior.

Run broader tests when modifying shared infrastructure, application
state, persistence layers, or common UI components.

Report test failures clearly.

## Type safety and linting
After modifying code, run the project's checks before completion.

Typical checks include:

- type checking
- linting
- tests
- build verification

When resolving type errors:

- do not introduce `any`
- do not suppress errors with `@ts-ignore` or disabled lint rules
- fix types at their source
- prefer `unknown` when a value is genuinely untyped

## Execution discipline
Do not run builds, tests, or linters if no files were modified.

Only execute commands necessary to validate the change.

## Code clarity
Write code that is easy for humans to understand.

Add comments only for:

- file purpose
- non-obvious algorithms
- important constants
- tricky edge cases

Avoid redundant comments.

## Documentation
Documentation should describe the system as implemented.

Update existing docs if behavior changes.

Do not create new docs unless explicitly requested.

## Completion report
When finishing a task, report:

- files changed
- behavior implemented or fixed
- how to build, run, or test the result
