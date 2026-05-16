export type Language = "cs" | "en" | "ru" | "uk";
export type ParticipationType = "financial" | "labor" | "mixed";

export interface OnboardingProfileRequest {
  tenantId: string;
  schoolId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  language: Language;
  participationType: ParticipationType;
}

export interface ChildInput {
  firstName: string;
  lastName: string;
  classId: string;
  notes?: string;
}

export interface OnboardingChildrenRequest {
  tenantId: string;
  schoolId: string;
  children: ChildInput[];
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
