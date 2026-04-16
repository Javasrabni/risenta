import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Write - Asisten Penulisan Akademis | Risenta',
  description: 'Editor teks cerdas dengan dukungan AI untuk penulisan artikel, essay, dan dokumen akademis',
  keywords: 'writing, academic, AI, editor, essay, artikel, thesis',
};

export default function WriteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}