'use client';

import { useEffect } from 'react';
// Vendored from shared/packages/consent — refresh with shared/scripts/sync-consent.sh.
import { mountConsentBanner } from '@/lib/consent/consent-banner.js';

/**
 * Bump when the consent wording changes; visitors are then asked again.
 * Kept in step with the ecosystem-wide version used by the other frontends.
 */
const CONSENT_VERSION = 'alfares-consent-v1';

/**
 * The platform stores only what it needs to keep a parent signed in — no
 * analytics, no marketing, no third-party trackers — so this is a disclosure
 * with one acknowledgement, not a list of switches that change nothing.
 *
 * The policy link points at this platform's own /gdpr page: the data controller
 * here is the school committee, not Alfares.
 */
export function ConsentBanner() {
  useEffect(() => {
    const banner = mountConsentBanner({
      version: CONSENT_VERSION,
      policyUrl: '/gdpr',
      text: {
        title: 'Cookies a úložiště',
        disclosureBody:
          'Ukládáme jen údaje nezbytné pro přihlášení a bezpečný chod platformy. Nepoužíváme analytické ani marketingové cookies a nesledujeme vás na jiných webech.',
        acknowledge: 'Rozumím',
        policyLabel: 'Zásady ochrany osobních údajů',
      },
    });

    return () => banner.destroy();
  }, []);

  return null;
}
