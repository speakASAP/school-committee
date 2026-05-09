#!/usr/bin/env bash
# ============================================================
# WARNING: Run manually with real values. Never commit values.
# ============================================================
# This script documents the Vault write commands needed for
# initial secret provisioning of school-committee.
# Replace every <REPLACE_ME_*> placeholder with the real value
# before running. Do NOT commit a version of this file that
# contains real credentials.
# ============================================================

set -euo pipefail

VAULT_ADDR="${VAULT_ADDR:-http://127.0.0.1:8200}"
export VAULT_ADDR

# Ensure vault CLI is available and authenticated
vault status > /dev/null

# Auth service secrets
vault kv put secret/prod/school-committee/auth \
  AUTH_SERVICE_CLIENT_SECRET="<REPLACE_ME_AUTH_SERVICE_CLIENT_SECRET>"

# Database secrets (DB_SERVICE_TOKEN = PostgreSQL password for dbadmin)
vault kv put secret/prod/school-committee/db \
  DB_SERVICE_TOKEN="<REPLACE_ME_DB_PASSWORD>"

# Payment secrets (Czech bank spolek account)
vault kv put secret/prod/school-committee/payments \
  PAYMENT_WEBHOOK_SECRET="<REPLACE_ME_PAYMENT_WEBHOOK_SECRET>" \
  PAYMENT_ACCOUNT_IBAN="<REPLACE_ME_IBAN_CZ>" \
  PAYMENT_ACCOUNT_NUMBER="<REPLACE_ME_ACCOUNT_NUMBER>" \
  PAYMENT_BANK_CODE="<REPLACE_ME_BANK_CODE>"

# Notification secrets (SMTP)
vault kv put secret/prod/school-committee/notifications \
  SMTP_HOST="<REPLACE_ME_SMTP_HOST>" \
  SMTP_USER="<REPLACE_ME_SMTP_USER>" \
  SMTP_PASSWORD="<REPLACE_ME_SMTP_PASSWORD>" \
  EMAIL_FROM="<REPLACE_ME_EMAIL_FROM>"

# Storage secrets (MinIO)
vault kv put secret/prod/school-committee/storage \
  STORAGE_ACCESS_KEY="<REPLACE_ME_MINIO_ACCESS_KEY>" \
  STORAGE_SECRET_KEY="<REPLACE_ME_MINIO_SECRET_KEY>" \
  STORAGE_BUCKET="school-committee"

echo "Vault secrets written for school-committee."
echo "Verify with: vault kv list secret/prod/school-committee/"
