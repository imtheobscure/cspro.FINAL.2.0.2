import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata:Metadata={title:'ToyBox — Tutorly Kids (Ages 3–6)',description:'ToyBox is a calm little playroom of nine hands-on, tutor-led bilingual studios for ages 3–6: trace letters in the sandbox, echo words to Momo, blend sound smoothies, hunt objects on camera, act out charades, build sentences on the talking train and dress Pip — with a word garden, ready-made lessons and read-aloud in six languages.',applicationName:'ToyBox'};
export const viewport:Viewport={width:'device-width',initialScale:1,themeColor:'#fafaf6'};
export default function RootLayout({children}:{children:ReactNode}){return <html lang="en"><head><link rel="preconnect" href="https://fonts.googleapis.com"/><link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/><link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;450;500;550;600;650;700&family=Manrope:wght@400;500;600;650;700;750;800&family=Noto+Sans+SC:wght@400;500;600;700&display=swap" rel="stylesheet"/></head><body>{children}</body></html>;}
