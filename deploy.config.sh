# deploy.config.sh — declaration consumed by shared/scripts/deploy.sh.
# See shared/docs/DEPLOY_STANDARDIZATION_REPORT.md section 6/7 for the design.
# scripts/deploy.sh is still the live, authoritative deploy path.
#
# Real script applies the ClusterIssuer without -n (it's cluster-scoped, not
# namespaced) via a preflight step, then `kubectl apply -f k8s/` (whole
# directory). MANIFESTS lists the directory's namespaced files individually
# instead of relying on "apply whole directory" — same net effect, explicit.

SERVICE_NAME="school-committee"
PORT="4800"

IMAGES=(
  "school-committee|.||--no-cache"
)

DEPLOYMENTS=(
  "school-committee|app|school-committee"
)

MANIFESTS=(external-secret.yaml configmap.yaml deployment.yaml service.yaml ingress.yaml middleware-https-redirect.yaml)

deploy_preflight() {
  kubectl apply -f "$PROJECT_ROOT/k8s/cluster-issuer-http01.yaml"
}
