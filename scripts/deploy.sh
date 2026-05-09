#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

SERVICE_NAME="school-committee"
IMAGE="localhost:5000/${SERVICE_NAME}:latest"
NAMESPACE="statex-apps"
EXTERNAL_SECRET_NAME="${SERVICE_NAME}-secret"

wait_for_external_secret_ready() {
  echo -e "${YELLOW}→ Verifying ExternalSecret readiness...${NC}"
  if ! kubectl wait \
    --for=condition=Ready \
    "externalsecret/${EXTERNAL_SECRET_NAME}" \
    -n "${NAMESPACE}" \
    --timeout=60s; then
    echo -e "${RED}✖ ExternalSecret is not ready: ${EXTERNAL_SECRET_NAME}${NC}"
    kubectl -n "${NAMESPACE}" describe externalsecret "${EXTERNAL_SECRET_NAME}" || true
    exit 1
  fi
  echo -e "${GREEN}✓ ExternalSecret ready${NC}"
}

echo -e "${BLUE}╔══════════════════════════════════════╗${NC}"
echo -e "${BLUE}║       Deploy: School Committee       ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════╝${NC}"

cd "$PROJECT_ROOT"

echo -e "${YELLOW}→ Building Docker image...${NC}"
docker build --no-cache -t "$IMAGE" .

echo -e "${YELLOW}→ Pushing to local registry...${NC}"
docker push "$IMAGE"

echo -e "${YELLOW}→ Applying K8s manifests...${NC}"
kubectl apply -f k8s/external-secret.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/configmap.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/ -n "${NAMESPACE}"
wait_for_external_secret_ready

echo -e "${YELLOW}→ Forcing pod restart to pick up new image...${NC}"
kubectl rollout restart deployment/"$SERVICE_NAME" -n "${NAMESPACE}"

echo -e "${YELLOW}→ Waiting for rollout...${NC}"
kubectl rollout status deployment/"$SERVICE_NAME" -n "${NAMESPACE}" --timeout=120s

echo -e "${GREEN}╔══════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✅ School Committee Deploy complete ║${NC}"
echo -e "${GREEN}║  https://school-committee.alfares.cz ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════╝${NC}"
