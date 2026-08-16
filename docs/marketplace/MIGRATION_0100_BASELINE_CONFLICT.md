# Migration 0100 Baseline Conflict

Status: `FULL_PROJECT_CLEAN_INSTALL_BLOCKED_BY_MARKETPLACE_MIGRATION_0100`
Date: 2026-08-04 (Asia/Saigon)
Repository: `vinh17491/GymFit`
Branch: `coach1`
Verification commit: `232df83e4dfc5766b65289e925f25cf8d4f6914d`

## Reproduction

On a fresh database created from the repository baseline schema, the normal migration runner applied migrations `0001` through `0009` successfully. Migration `0100_seller_application_role_foundation.sql` then failed because the baseline schema already contains the `SellerApplications` table:

```text
There is already an object named 'SellerApplications' in the database.
```

The migration transaction was rolled back at `0100`. The isolated database used for that reproduction was `GYMFIT_DB_COACH_FINAL_20260804_001000` and was subsequently dropped and verified absent.

## Scope classification

This is a pre-existing Marketplace/Seller baseline conflict and is outside the Coach module scope. No migration `0100`–`0111`, Marketplace business logic, SellerApplications schema, Video module or Auth architecture was changed in the Coach cleanup.

Coach migrations `0007`, `0008` and `0009` are independently applied and checksum-verified. The canonical database status is `21 applied`, `0 pending`, `0 checksum mismatch`.

## Follow-up

Investigate this separately on:

```text
fix/marketplace-migration-0100
```
