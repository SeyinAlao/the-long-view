import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = { title: 'Privacy Policy - The Long View' };

export default function PrivacyPage() {
  return <LegalDocument file="privacy-policy.md" />;
}
