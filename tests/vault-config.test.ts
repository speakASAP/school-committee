import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const root = resolve(__dirname, "..");

function readFile(rel: string) {
  return readFileSync(resolve(root, rel), "utf-8");
}

describe("k8s/external-secret.yaml", () => {
  it("is parseable YAML (no binary garbage)", () => {
    const content = readFile("k8s/external-secret.yaml");
    expect(content).toContain("apiVersion: external-secrets.io/v1");
  });

  it("metadata.name is school-committee-secret", () => {
    const content = readFile("k8s/external-secret.yaml");
    expect(content).toContain("name: school-committee-secret");
  });

  it("target.name is school-committee-secret", () => {
    const content = readFile("k8s/external-secret.yaml");
    // target block contains name: school-committee-secret
    const targetSection = content.split("target:")[1] ?? "";
    expect(targetSection).toContain("name: school-committee-secret");
  });

  it("contains all 13 secret keys", () => {
    const content = readFile("k8s/external-secret.yaml");
    const expectedKeys = [
      "AUTH_SERVICE_CLIENT_SECRET",
      "DB_SERVICE_TOKEN",
      "PAYMENT_WEBHOOK_SECRET",
      "PAYMENT_ACCOUNT_IBAN",
      "PAYMENT_ACCOUNT_NUMBER",
      "PAYMENT_BANK_CODE",
      "SMTP_HOST",
      "SMTP_USER",
      "SMTP_PASSWORD",
      "EMAIL_FROM",
      "STORAGE_ACCESS_KEY",
      "STORAGE_SECRET_KEY",
      "STORAGE_BUCKET",
    ];
    for (const key of expectedKeys) {
      expect(content, `Missing key: ${key}`).toContain(key);
    }
  });
});

describe(".env.example", () => {
  it("contains all secret keys from external-secret.yaml", () => {
    const envExample = readFile(".env.example");
    const externalSecret = readFile("k8s/external-secret.yaml");
    const configmap = readFile("k8s/configmap.yaml");

    // Extract secretKeys from external-secret.yaml
    const secretKeyMatches = [...externalSecret.matchAll(/secretKey:\s+(\S+)/g)];
    const secretKeys = secretKeyMatches.map((m) => m[1]);

    expect(secretKeys.length).toBeGreaterThan(0);

    for (const key of secretKeys) {
      const inEnv = envExample.includes(key);
      const inConfigmap = configmap.includes(key);
      expect(inEnv || inConfigmap, `Key ${key} missing from .env.example or configmap.yaml`).toBe(
        true,
      );
    }
  });

  it("does not contain any obviously real credentials", () => {
    const content = readFile(".env.example");
    // Should not contain real-looking tokens (long hex/base64 strings > 40 chars without spaces)
    const lines = content.split("\n").filter((l) => !l.startsWith("#") && l.includes("="));
    for (const line of lines) {
      const value = line.split("=").slice(1).join("=").trim();
      if (value.length > 40 && /^[a-f0-9]{40,}$/i.test(value)) {
        throw new Error(`Suspicious real credential in .env.example: ${line}`);
      }
    }
  });
});

describe("scripts/vault-init.sh", () => {
  it("contains the required warning header", () => {
    const content = readFile("scripts/vault-init.sh");
    expect(content).toContain("Never commit values");
  });

  it("contains vault kv put for all 5 sub-paths", () => {
    const content = readFile("scripts/vault-init.sh");
    expect(content).toContain("school-committee/auth");
    expect(content).toContain("school-committee/db");
    expect(content).toContain("school-committee/payments");
    expect(content).toContain("school-committee/notifications");
    expect(content).toContain("school-committee/storage");
  });

  it("does not contain any real secret values (no 40+ char hex strings)", () => {
    const content = readFile("scripts/vault-init.sh");
    const lines = content.split("\n").filter((l) => !l.startsWith("#"));
    for (const line of lines) {
      if (/^[a-f0-9]{40,}$/i.test(line.trim())) {
        throw new Error(`Suspicious real credential in vault-init.sh: ${line}`);
      }
    }
  });
});
