import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockCreateFeedback, mockWriteAuditEvent, mockTranscribeVoice, mockTryGetCurrentUser } =
  vi.hoisted(() => ({
    mockCreateFeedback: vi.fn(),
    mockWriteAuditEvent: vi.fn(),
    mockTranscribeVoice: vi.fn(),
    mockTryGetCurrentUser: vi.fn(),
  }));

vi.mock("@/lib/db/feedback", () => ({ createFeedback: mockCreateFeedback }));
vi.mock("@/lib/db/audit", () => ({ writeAuditEvent: mockWriteAuditEvent }));
vi.mock("@/lib/ai/transcribe", () => ({ transcribeVoice: mockTranscribeVoice }));
vi.mock("@/lib/auth/get-current-user", () => ({ tryGetCurrentUser: mockTryGetCurrentUser }));

import { POST } from "@/app/api/feedback/route";

beforeEach(() => {
  vi.clearAllMocks();
  mockTryGetCurrentUser.mockResolvedValue({ id: "u-1", email: "p@test.com", roles: ["parent"] });
  mockWriteAuditEvent.mockResolvedValue(undefined);
  mockCreateFeedback.mockResolvedValue({ id: "fi-1", status: "new" });
});

describe("POST /api/feedback — voice transcription", () => {
  it("transcribes voice and stores transcript when voiceFileKey provided", async () => {
    mockTranscribeVoice.mockResolvedValue("Potřebujeme více počítačů");

    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schoolId: "s-1",
        category: "general",
        type: "suggestion",
        text: "see voice",
        isAnonymous: false,
        voiceFileKey: "uploads/voice-abc.webm",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockTranscribeVoice).toHaveBeenCalledWith("uploads/voice-abc.webm", undefined);
    expect(mockCreateFeedback).toHaveBeenCalledWith(
      expect.objectContaining({
        voiceFileKey: "uploads/voice-abc.webm",
        voiceTranscript: "Potřebujeme více počítačů",
      }),
    );
  });

  it("skips transcription when voiceFileKey absent", async () => {
    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schoolId: "s-1",
        category: "general",
        type: "suggestion",
        text: "plain text feedback",
        isAnonymous: false,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(mockTranscribeVoice).not.toHaveBeenCalled();
  });

  it("returns 500 when transcription service fails", async () => {
    mockTranscribeVoice.mockRejectedValue(new Error("Voice transcription failed: 503"));

    const req = new NextRequest("http://localhost/api/feedback", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        schoolId: "s-1",
        category: "general",
        type: "suggestion",
        text: "see voice",
        isAnonymous: false,
        voiceFileKey: "uploads/bad.webm",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
