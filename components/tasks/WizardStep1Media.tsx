"use client";
import { VoiceRecorder } from "./VoiceRecorder";
import { MediaUploader } from "./MediaUploader";

interface Step1State {
  audioFileId?: string;
  photoFileIds: string[];
  videoFileIds: string[];
  textNote: string;
}

interface WizardStep1MediaProps {
  state: Step1State;
  onChange: (updates: Partial<Step1State>) => void;
  onNext: () => void;
}

export function WizardStep1Media({ state, onChange, onNext }: WizardStep1MediaProps) {
  const canGenerate = !!(state.audioFileId || state.videoFileIds.length || state.textNote.trim());

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Hlasová zpráva</h2>
        <p className="text-sm text-gray-500 mb-3">Nahrajte popis úkolu hlasem</p>
        <VoiceRecorder
          onUploaded={(fileKey) => onChange({ audioFileId: fileKey })}
          disabled={!!state.audioFileId}
        />
        {state.audioFileId && (
          <button type="button" onClick={() => onChange({ audioFileId: undefined })} className="mt-1 text-xs text-red-500 hover:underline">
            Odstranit nahrávku
          </button>
        )}
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Fotografie</h2>
        <MediaUploader type="photo" onFilesChange={(keys) => onChange({ photoFileIds: keys })} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Videa</h2>
        <MediaUploader type="video" onFilesChange={(keys) => onChange({ videoFileIds: keys })} />
      </div>

      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Textová poznámka</h2>
        <textarea
          className="w-full rounded-lg border border-gray-200 p-3 text-sm resize-none focus:outline-none focus:border-blue-400"
          rows={3}
          placeholder="Doplňte cokoli, co AI může potřebovat vědět..."
          value={state.textNote}
          onChange={(e) => onChange({ textNote: e.target.value })}
        />
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={!canGenerate}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold disabled:opacity-40 hover:bg-blue-700 transition-colors"
      >
        Generovat návrh úkolu
      </button>
    </div>
  );
}
