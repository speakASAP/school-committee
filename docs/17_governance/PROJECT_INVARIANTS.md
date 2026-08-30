# Project Invariants — school-committee

## Purpose
Make the approved MVP boundaries operational.

## Applicability
Applies to all repository implementation, configuration, and documentation changes.

## Invariants
Preserve no-child-account and no-public-individual-payment constraints; do not bypass auth identity validation; protect payment and personal data; do not import school data without consent.

## Exceptions
Only an owner-approved amendment may change these protected boundaries.

## Review Cadence
Review with every proposed feature or integration change.
Status: reviewed
completeness_level: complete
