import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { withBase } from '@/lib/basePath';
import { ImageGuard } from '@/components/image-guard';
import './globals.css';
// `icons` is a plain URL in the document head — Next prefixes route links and
// its own assets for `basePath`, but NOT a public file named here, so a bare
// '/icon.svg' would ask the site root and 404 under the deployed sub-path.
export const metadata: Metadata = { title: 'Tutorly · Your next chapter starts here', description: 'Find your voice with Tutorly. 24 unique interviewers, thoughtful lessons, real-world scenarios, and a safe space to practice English interviews at your own pace.', icons: { icon: withBase('/icon.svg') }, applicationName: 'Tutorly', robots: { index: false, follow: false } };
export default function RootLayout({ children }: { children: ReactNode }) { return <html lang="en"><body><ImageGuard />{children}</body></html>; }
