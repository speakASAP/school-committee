#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# shellcheck disable=SC1091
source "$(dirname "$PROJECT_ROOT")/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" 2>/dev/null \
  || source "$HOME/Documents/Github/shared/scripts/load-deploy-phase-timing.sh" "$PROJECT_ROOT" \
  || { echo "Error: deploy timing library not found" >&2; exit 1; }
deploy_timing_init "school-committee"

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

deploy_timing_phase_start "Build image"
echo -e "${YELLOW}→ Building Docker image...${NC}"
docker build --no-cache -t "$IMAGE" .
deploy_timing_phase_end "Build image"

deploy_timing_phase_start "Push image"
echo -e "${YELLOW}→ Pushing to local registry...${NC}"
docker push "$IMAGE"
deploy_timing_phase_end "Push image"

deploy_timing_phase_start "Apply ClusterIssuer"
echo -e "${YELLOW}→ Applying ClusterIssuer (HTTP-01 for strilkove.cz)...${NC}"
kubectl apply -f k8s/cluster-issuer-http01.yaml
deploy_timing_phase_end "Apply ClusterIssuer"

deploy_timing_phase_start "Apply K8s manifests"
echo -e "${YELLOW}→ Applying K8s manifests...${NC}"
kubectl apply -f k8s/external-secret.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/configmap.yaml -n "${NAMESPACE}"
kubectl apply -f k8s/ -n "${NAMESPACE}"
wait_for_external_secret_ready
deploy_timing_phase_end "Apply K8s manifests"

deploy_timing_phase_start "Rollout restart"
echo -e "${YELLOW}→ Forcing pod restart to pick up new image...${NC}"
kubectl rollout restart deployment/"$SERVICE_NAME" -n "${NAMESPACE}"
deploy_timing_phase_end "Rollout restart"

deploy_timing_phase_start "Wait for rollout"
echo -e "${YELLOW}→ Waiting for rollout...${NC}"
deploy_timing_k8s_rollout_wait kubectl "$SERVICE_NAME" "$NAMESPACE"
deploy_timing_phase_end "Wait for rollout"

deploy_timing_finish_success "School Committee"
echo -e "${GREEN}https://strilkove.cz${NC}"
DEPLOY_TIMING_FINISHED=1
exit 0
