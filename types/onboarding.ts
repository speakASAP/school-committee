export type Language = "cs" | "en" | "ru" | "uk";
export type ParticipationType = "financial" | "labor" | "mixed";

export interface OnboardingProfileRequest {
  tenantId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  language: Language;
  classId: string;
  childrenCount: number;
  childBirthYears?: number[];
  participationType: ParticipationType;
}

export interface ConsentRecord {
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  parentCommitteeParticipation: boolean;
  version: string;
  timestamp: string;
}

export interface RecordConsentRequest {
  tenantId: string;
  schoolId: string;
  consent: ConsentRecord;
}
