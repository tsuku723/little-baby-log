# LittleBabylog - Codex Development Guide

## Project

LittleBabylog is a React Native / Expo application for recording the growth and daily life of premature / low-birth-weight babies.

When documentation conflicts with the current implementation, treat the current Git working tree as the source of truth.

## Worktree Rules

The repository uses multiple Git worktrees.

- `little-baby-age-expo54-main`
  - Main branch worktree.
  - Keep aligned with `main`.
  - Use for read-only verification and investigation.
  - Do not perform implementation work here.

- `little-baby-age-expo54-wk1`
  - Implementation worktree.

- `little-baby-age-expo54-wk2`
  - Implementation worktree.

- `little-baby-age-expo54-wk3`
  - Implementation worktree.

- `little-baby-age-expo54`
  - Consultation / requirements worktree.
  - Do not perform implementation work here.

When asked to implement a change, verify that the current working directory is one of `wk1`, `wk2`, or `wk3` before modifying files.

Never switch worktrees or branches automatically.

## Git Safety

Before modifying files, inspect the current branch and `git status`.

Do not perform these operations unless explicitly requested:

- git commit
- git push
- git checkout
- git switch
- git merge
- git rebase
- git reset
- branch deletion
- destructive Git operations

Do not discard or overwrite existing user changes.

## Package / Dependency Safety

Do not run `npm install` or `npm update` unless explicitly requested.

Do not upgrade, remove, or add dependencies unless the requested task requires it and the user has explicitly approved the dependency change.

Do not modify `package.json` or lock files unnecessarily.

## Source of Truth

Use this priority when information conflicts:

1. Current Git working tree
2. Current project configuration such as `package.json` and `app.json`
3. Current development rules
4. Documentation
5. Historical AI summaries or assumptions

Treat older documentation as potentially stale.

Do not assume historical specifications still match the current implementation.

The project also has an existing project-level development rules file at:

C:\Users\janne\source\CLAUDE.md

When project-level development rules, Git workflow, worktree conventions, versioning rules, or release procedures are relevant, read and follow that file as well.

## Application Architecture

### Entry point

`index.ts` → `App.tsx` → `src/App.tsx`

The effective initial screen is:

`RootNavigator`
→ `MainTabs`
→ `CalendarStack`
→ `Calendar`
→ `src/screens/CalendarScreen.tsx`

### Main state / persistence

`src/state/AppStateContext.tsx` is the primary source of truth for persisted application state.

Main persisted key:

`little_baby_calendar_app_state`

Important functions include:

- `loadAppState`
- `persistState`
- `updateState`
- `restoreState`

Normal state changes should go through the state/update functions exposed by `AppStateContext`.

`src/state/AchievementsContext.tsx` is a UI-facing / derived layer for achievement records. It is not the persistence layer.

### Legacy storage

`src/storage/storage.ts` is legacy migration code.

It handles legacy keys such as:

- `little_baby_calendar_user_settings`
- `little_baby_calendar_achievements`

Do not use `storage.ts` for new persistence logic.

Do not remove or rewrite the existing legacy migration path unless explicitly requested.

## useAchievements Warning

There are two `useAchievements` implementations.

For record CRUD and UI usage, import from:

```ts
import { useAchievements } from "@/state/AchievementsContext";
```

`src/state/AppStateContext.tsx` also contains a same-named hook with a different return type.

Do not import the wrong implementation.

## Age / Calendar Logic

`src/utils/dateUtils.ts` contains the core logic for:

- chronological age
- corrected age
- gestational age
- age display formats
- calendar month generation

The main function is:

`calculateAgeInfo`

Related logic also exists in:

- `src/utils/milestones.ts`
- `src/utils/weekAgeSegments.ts`
- `src/utils/ageLabelNormalization.ts`

Before changing age-related logic, inspect the existing tests and boundary cases.

Do not rewrite or simplify age calculations without verifying the affected tests.

## Photos

Photo files are stored under the app's file-system document directory.

Application state stores relative photo paths such as:

- `achievement-photos/...`
- `profile-photos/...`

Resolve relative paths to absolute URIs only when displaying or operating on files.

Do not store device-specific absolute file paths in application state.

Related implementation:

`src/utils/photo.ts`

## Navigation

Route and parameter types are centralized in:

`src/navigation/types.ts`

Navigation structure is implemented in:

- `src/navigation/RootNavigator.tsx`
- `src/navigation/TabNavigator.tsx`

When adding or changing screens/routes, update the route types as required.

## Tests

Important verification commands:

```bash
npm run typecheck
npm run test:unit
```

The CI checks:

- TypeScript typecheck
- Jest unit tests with coverage
- Expo Doctor

Age-related tests have a separate execution path:

```bash
npm test
```

Do not assume `npm test` runs the complete Jest suite.

## Documentation

Documentation under `docs/` may be stale.

In particular, some screen specifications describe screens that no longer exist.

`docs/testing/e2e-manual-test-spec.md` is maintained more actively than most other documents.

When documentation conflicts with the current implementation, verify the code first.

Legal content is maintained separately between the app and website and may require manual synchronization.

## Native / Platform Notes

The app is primarily maintained for iOS.

Some native features require a development build and cannot be fully validated in Expo Go.

Relevant areas include:

- AdMob
- Firebase Analytics
- notifications
- ATT

Do not assume Expo Go is sufficient for validating native functionality.

## Coding Style

Prefer simple, readable solutions.

Avoid unnecessary abstraction.

Do not add compatibility hacks or defensive complexity without a concrete reason.

Reuse existing patterns and utilities before introducing new architecture.

Before making a change, identify the smallest set of files that actually need modification.

## Change Policy

Unless explicitly requested, do not:

- change product requirements
- redesign unrelated screens
- refactor unrelated code
- update dependencies
- modify Git history
- create commits or push changes

For ambiguous requirements, inspect the existing implementation and report the ambiguity before making a broad architectural change.
