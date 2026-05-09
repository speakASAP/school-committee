import { NextResponse } from "next/server";

interface HealthCheck {
  status: "ok" | "missing";
}

interface ReadyResponse {
  status: "ok" | "degraded";
  checks: Record<string, HealthCheck>;
}

function checkEnv(name: string): HealthCheck {
  return { status: process.env[name] ? "ok" : "missing" };
}

export function GET() {
  const checks: Record<string, HealthCheck> = {
    AUTH_SERVICE_BASE_URL: checkEnv("AUTH_SERVICE_BASE_URL"),
    DB_HOST: checkEnv("DB_HOST"),
    LOGGING_SERVICE_URL: checkEnv("LOGGING_SERVICE_URL"),
  };

  const allOk = Object.values(checks).every((c) => c.status === "ok");

  const body: ReadyResponse = {
    status: allOk ? "ok" : "degraded",
    checks,
  };

  return NextResponse.json(body, { status: allOk ? 200 : 503 });
}
