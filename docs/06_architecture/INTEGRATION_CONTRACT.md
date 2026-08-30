# Integration Contract — school-committee

## Purpose
Record the runtime integrations declared by the existing project configuration.

## Capability Decisions
### auth
Decision: required
Contract: Authentication is delegated to auth-microservice; School Committee enforces school-scoped local roles.
Configuration: AUTH_SERVICE_BASE_URL, audience, and Vault-provided client credentials.
Failure mode: Identity validation failure denies protected school actions.
Validation: Exercise token validation and local role guards.

### postgres
Decision: required
Contract: School-domain records use the declared school_committee_platform PostgreSQL database.
Configuration: DB_HOST, DB_PORT, DB_USER, DB_NAME, and Vault-provided DB credential.
Failure mode: Database unavailability makes data-backed actions unavailable.
Validation: Run data-access tests and readiness checks.

### logging
Decision: required
Contract: Structured operational logs are sent to logging-microservice.
Configuration: LOGGING_SERVICE_URL and LOGGING_SERVICE_API_PATH.
Failure mode: Logging delivery failure must not expose sensitive content or corrupt requests.
Validation: Verify configured logging endpoint and health checks.

### notifications
Decision: required
Contract: Notification delivery is configured through notifications-microservice and SMTP settings.
Configuration: NOTIFICATION_SERVICE_BASE_URL and Vault-provided SMTP settings.
Failure mode: Notification failure leaves the primary action recorded and requires retry or operator follow-up.
Validation: Exercise notification paths with non-production data.

### ai
Decision: required
Contract: Voice transcription is configured through ai-microservice.
Configuration: AI_SERVICE_BASE_URL.
Failure mode: Transcription failure leaves voice-derived content unavailable without changing other records.
Validation: Exercise the configured transcription integration when implemented.

### payments
Decision: required
Contract: The platform generates Czech QR bank-payment information and verifies payment webhooks.
Configuration: Vault-provided payment account settings and PAYMENT_WEBHOOK_SECRET.
Failure mode: Payment verification failure prevents confirmation rather than inventing a paid state.
Validation: Test QR generation and webhook signature handling with test inputs.

### object-storage
Decision: required
Contract: Configured MinIO/S3 credentials support storage needs described by the application configuration.
Configuration: Vault-provided STORAGE_ACCESS_KEY, STORAGE_SECRET_KEY, and STORAGE_BUCKET.
Failure mode: Object-storage failure leaves affected uploads unavailable without exposing credentials.
Validation: Exercise storage access with a non-production object.

### docs-rag
Decision: required
Contract: Repository documentation is discoverable through docs-rag-microservice under ecosystem policy.
Configuration: Docs-RAG registration is managed by the ecosystem indexer, not application secrets.
Failure mode: RAG unavailability does not replace Git as documentation authority.
Validation: Confirm Git sources and use bounded retrieval when the service is healthy.

### monitoring
Decision: required
Contract: Kubernetes probes use the live and ready health endpoints.
Configuration: Deployment probes target /api/health/live and /api/health/ready on port 4800.
Failure mode: An unhealthy instance is removed from ready traffic by Kubernetes.
Validation: Call both declared health endpoints and inspect probe configuration.
### redis
Decision: not-applicable
Reason: redis is not configured or referenced by the current school-committee runtime manifests or environment contract.

### catalog
Decision: not-applicable
Reason: catalog is not configured or referenced by the current school-committee runtime manifests or environment contract.

### orders
Decision: not-applicable
Reason: orders is not configured or referenced by the current school-committee runtime manifests or environment contract.

### warehouse
Decision: not-applicable
Reason: warehouse is not configured or referenced by the current school-committee runtime manifests or environment contract.

### invoices
Decision: not-applicable
Reason: invoices is not configured or referenced by the current school-committee runtime manifests or environment contract.

### event-bus
Decision: not-applicable
Reason: event-bus is not configured or referenced by the current school-committee runtime manifests or environment contract.

### backups
Decision: not-applicable
Reason: backups is not configured or referenced by the current school-committee runtime manifests or environment contract.

## Data Ownership
School Committee owns school-domain records and local roles; auth-microservice owns identity issuance.

## Authentication and Authorization
Auth tokens are validated through auth-microservice; local school-scoped roles and approval status are enforced here.

## Synchronous Dependencies
Configured synchronous dependencies are auth, PostgreSQL, logging, notifications, AI, payments, and object storage.

## Asynchronous Dependencies
No event-bus dependency is declared in the current manifests.

## Degraded Operation
Failure of a dependency must make the affected capability unavailable without fabricating identity, payment, or persisted state.

## Validation
Validate configuration, health endpoints, and the required integration behaviors named above.
