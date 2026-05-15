import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function readManifest(name: string) {
  return readFileSync(resolve(root, "k8s", name), "utf-8");
}

describe("k8s/deployment.yaml", () => {
  const content = readManifest("deployment.yaml");

  it("targets statex-apps namespace", () => {
    expect(content).toContain("namespace: statex-apps");
  });

  it("has 2 replicas", () => {
    expect(content).toContain("replicas: 2");
  });

  it("uses imagePullPolicy: Always", () => {
    expect(content).toContain("imagePullPolicy: Always");
  });

  it("has liveness probe at /api/health/live", () => {
    expect(content).toContain("/api/health/live");
  });

  it("has readiness probe at /api/health/ready", () => {
    expect(content).toContain("/api/health/ready");
  });

  it("references configmap and secret via envFrom", () => {
    expect(content).toContain("configMapRef");
    expect(content).toContain("secretRef");
    expect(content).toContain("school-committee-config");
    expect(content).toContain("school-committee-secret");
  });

  it("does not contain secret values", () => {
    const secretPatterns = [
      /password:\s+\S+/i,
      /token:\s+[a-f0-9]{20,}/i,
    ];
    for (const pattern of secretPatterns) {
      expect(content, `Deployment contains possible secret: ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe("k8s/service.yaml", () => {
  const content = readManifest("service.yaml");

  it("is ClusterIP type", () => {
    expect(content).toContain("type: ClusterIP");
  });

  it("exposes port 4800", () => {
    expect(content).toContain("port: 4800");
  });
});

describe("k8s/ingress.yaml", () => {
  const content = readManifest("ingress.yaml");

  it("uses traefik ingressClassName", () => {
    expect(content).toContain("ingressClassName: traefik");
  });

  it("has cert-manager annotation", () => {
    expect(content).toContain("cert-manager.io/cluster-issuer");
    expect(content).toContain("letsencrypt-prod");
  });

  it("has TLS for correct domain", () => {
    expect(content).toContain("strilkove.cz");
    expect(content).toContain("tls:");
  });
});

describe("k8s/configmap.yaml", () => {
  const content = readManifest("configmap.yaml");

  it("contains DB_HOST and DB_NAME (non-secret config)", () => {
    expect(content).toContain("DB_HOST");
    expect(content).toContain("DB_NAME");
  });

  it("does not contain DB_SERVICE_TOKEN (secret)", () => {
    expect(content).not.toContain("DB_SERVICE_TOKEN");
  });
});
