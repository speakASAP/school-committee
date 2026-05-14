"use client";
import { useState } from "react";
import { WizardStep1Media } from "./WizardStep1Media";
import { WizardStep2Processing } from "./WizardStep2Processing";
import { WizardStep3Review } from "./WizardStep3Review";
import { WizardStep4Confirm } from "./WizardStep4Confirm";

type Step = 1 | 2 | 3 | 4;

interface MediaState {
  audioFileId?: string;
  photoFileIds: string[];
  videoFileIds: string[];
  textNote: string;
}

interface DraftTask {
  id: string;
  title: string;
  description: string;
  priority: string;
  deadline?: string;
  rawTranscript?: string;
  photos: { id: string; fileId: string }[];
  videos: { id: string; fileId: string }[];
  aiFailed?: boolean;
}

interface CreateTaskWizardProps {
  schoolId: string;
  tenantId: string;
}

export function CreateTaskWizard({ schoolId, tenantId }: CreateTaskWizardProps) {
  const [step, setStep] = useState<Step>(1);
  const [resetKey, setResetKey] = useState(0);
  const [media, setMedia] = useState<MediaState>({ photoFileIds: [], videoFileIds: [], textNote: "" });
  const [draft, setDraft] = useState<DraftTask | null>(null);
  const [publishedTaskId, setPublishedTaskId] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  function updateMedia(updates: Partial<MediaState>) {
    setMedia((prev) => ({ ...prev, ...updates }));
  }

  async function generateDraft() {
    setStep(2);
    setDraftError(null);
    try {
      const res = await fetch("/api/tasks/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          schoolId,
          tenantId,
          audioFileId: media.audioFileId,
          videoFileIds: media.videoFileIds,
          photoFileIds: media.photoFileIds,
          textNote: media.textNote || undefined,
        }),
      });
      if (!res.ok) {
        const body = await res.json() as { error?: { message?: string } };
        throw new Error(body.error?.message ?? "Generování selhalo");
      }
      const body = await res.json() as { data: DraftTask };
      setDraft(body.data);
      setStep(3);
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : "Chyba");
      setStep(1);
    }
  }

  function redo() {
    setMedia({ photoFileIds: [], videoFileIds: [], textNote: "" });
    setDraft(null);
    setResetKey((k) => k + 1);
    setStep(1);
  }

  function onPublished() {
    if (draft) setPublishedTaskId(draft.id);
    setStep(4);
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-6">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <div key={s} className={`flex-1 h-1 rounded-full ${s <= step ? "bg-blue-600" : "bg-gray-200"}`} />
        ))}
      </div>

      {step === 1 && (
        <>
          {draftError && <p className="mb-4 text-sm text-red-600 bg-red-50 rounded-lg p-3">{draftError}</p>}
          <WizardStep1Media key={resetKey} state={media} onChange={updateMedia} onNext={generateDraft} />
        </>
      )}
      {step === 2 && <WizardStep2Processing />}
      {step === 3 && draft && (
        <WizardStep3Review draft={draft} schoolId={schoolId} tenantId={tenantId} onPublished={onPublished} onRedo={redo} />
      )}
      {step === 4 && publishedTaskId && <WizardStep4Confirm taskId={publishedTaskId} />}
    </div>
  );
}
