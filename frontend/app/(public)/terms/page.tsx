import type { Metadata } from 'next';
import { LegalDocument } from '@/components/legal/legal-document';

export const metadata: Metadata = { title: 'Terms of Service - The Long View' };

export default function TermsPage() {
  return <LegalDocument file="terms.md" />;
}
