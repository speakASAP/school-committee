import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetCurrentUser, mockCallTaskDraftAI, mockCreateTaskDraft, mockTranscribe } = vi.hoisted(() => ({
  mockGetCurrentUser: vi.fn(),
  mockCallTaskDraftAI: vi.fn(),
  mockCreateTaskDraft: vi.fn(),
  mockTranscribe: vi.fn(),
}));

vi.mock("@/lib/auth/get-current-user", () => ({ getCurrentUser: mockGetCurrentUser }));
vi.mock("@/lib/ai/task-draft", () => ({ callTaskDraftAI: mockCallTaskDraftAI }));
vi.mock("@/lib/db/task-media", () => ({ createTaskDraft: mockCreateTaskDraft }));
vi.mock("@/lib/storage/transcribe", () => ({ transcribeAudioFile: mockTranscribe }));

import { POST } from "@/app/api/tasks/draft/route";

const teacherUser = { id: "u-1", email: "teacher@test.com", roles: ["teacher"] };
const parentUser = { id: "u-2", email: "parent@test.com", roles: ["parent"] };

function makeRequest(body: unknown) {
  return new NextRequest("http://localhost/api/tasks/draft", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetCurrentUser.mockResolvedValue(teacherUser);
});

describe("POST /api/tasks/draft", () => {
  it("returns 403 for parent role", async () => {
    mockGetCurrentUser.mockResolvedValue(parentUser);
    const res = await POST(makeRequest({ schoolId: "s-1", textNote: "test" }));
    expect(res.status).toBe(403);
  });

  it("returns 422 when no audio, video, or textNote provided", async () => {
    const res = await POST(makeRequest({ schoolId: "s-1" }));
    expect(res.status).toBe(422);
  });

  it("returns 400 when schoolId is missing", async () => {
    const res = await POST(makeRequest({ textNote: "test" }));
    expect(res.status).toBe(400);
  });

  it("creates draft from textNote without transcription", async () => {
    mockCallTaskDraftAI.mockResolvedValue({ title: "T", description: "D", priority: "normal", modelTier: "smart" });
    mockCreateTaskDraft.mockResolvedValue({ id: "task-1", status: "draft", title: "T", description: "D", priority: "normal", photos: [], videos: [] });
    const res = await POST(makeRequest({ schoolId: "s-1", tenantId: "t-1", textNote: "Natřít okna" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("draft");
    expect(mockTranscribe).not.toHaveBeenCalled();
  });

  it("calls transcribe when audioFileId is provided", async () => {
    mockTranscribe.mockResolvedValue("přepis hlasové zprávy");
    mockCallTaskDraftAI.mockResolvedValue({ title: "T", description: "D", priority: "normal", modelTier: "smart" });
    mockCreateTaskDraft.mockResolvedValue({ id: "task-1", status: "draft", title: "T", description: "D", priority: "normal", photos: [], videos: [] });
    const res = await POST(makeRequest({ schoolId: "s-1", tenantId: "t-1", audioFileId: "voice/abc.webm" }));
    expect(res.status).toBe(200);
    expect(mockTranscribe).toHaveBeenCalledWith("voice/abc.webm", expect.any(String));
  });

  it("still creates draft when AI fails (falls back to raw transcript)", async () => {
    mockTranscribe.mockResolvedValue("přepis");
    mockCallTaskDraftAI.mockRejectedValue(new Error("AI timeout"));
    mockCreateTaskDraft.mockResolvedValue({ id: "task-1", status: "draft", title: "přepis", description: "přepis", priority: "normal", photos: [], videos: [] });
    const res = await POST(makeRequest({ schoolId: "s-1", tenantId: "t-1", audioFileId: "voice/abc.webm" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.aiFailed).toBe(true);
  });
});
