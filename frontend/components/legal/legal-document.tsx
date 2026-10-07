import { readFile } from 'node:fs/promises';
import path from 'node:path';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// The Terms and the Privacy Policy, rendered from the same markdown files
// the reviewer reads (docs/legal/), so the page can never drift from the
// reviewed text. Read at build time: these pages are static. react-markdown
// escapes everything and renders no raw HTML (no dangerouslySetInnerHTML),
// so the documents can't inject markup. remark-gfm adds the tables.
const LEGAL_DIR = path.join(process.cwd(), '..', 'docs', 'legal');

export async function LegalDocument({ file }: { file: 'terms.md' | 'privacy-policy.md' }) {
  const source = await readFile(path.join(LEGAL_DIR, file), 'utf8');
  return (
    <main className="legal-document mx-auto min-h-screen max-w-2xl px-5 py-10 text-sm leading-relaxed text-ink/90 sm:px-8 sm:py-16">
      <Markdown remarkPlugins={[remarkGfm]}>{source}</Markdown>
    </main>
  );
}
