import React, { useEffect, FC } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The version this file announces in the tab title, the meta description and the
 * OG/Twitter cards.
 *
 * Everything else the user sees already says 2.0.1 — `index.html`'s title, og:title,
 * twitter:title and apple-mobile-web-app-title, the header badge, the drawer badge,
 * the What's New panel. This file was the one straggler at 2.0.0, and it wins at
 * runtime: it overwrites `document.title` on every route change, so the tab and any
 * shared link preview read 2.0.0 while the app itself read 2.0.1. Kept as a single
 * constant here so this file at least cannot drift against itself again.
 */
const APP_VERSION = "2.0.1";

export const SEOManager: FC = () => {
  const location = useLocation();

  useEffect(() => {
    const handleSEOUpdate = () => {
      let title = `Classroom Screen ${APP_VERSION} | Tutorly CSpro`;
      let description = `Classroom Screen ${APP_VERSION} (Tutorly CSpro) is the ultimate AI engine for English educators and online language tutors. Generate hyper-personalized lesson plans, responsive study guides, diagnostic assessments, global speaking challenges, and offline-first interactive learning aids.`;
      let keywords = `Classroom Screen ${APP_VERSION}, ClassroomScreen, Tutorly CSpro, Tutomy, English Lesson Planner, Class Prep AI, Personalized Education, Classroom Gamification, ESOL Worksheet Generator, English Teaching Platform, Student Competency Maps`;
      let ogType = "website";
      
      const pathWithHash = location.pathname + location.hash;
      const cleanPath = location.pathname;

      if (cleanPath === "/" || cleanPath === "") {
        title = `Classroom Screen ${APP_VERSION} | Tutorly CSpro`;
        description = `Classroom Screen ${APP_VERSION}: Empower English teachers and online tutors with dynamic pedagogical plans, study worksheets, interactive lessons, offline PWA saving, and custom homework modules designed by expert AI.`;
      } else if (cleanPath.startsWith("/dashboard")) {
        // Same name the header shows — the two were "Teacher Dashboard" and
        // "Tutor Academy Learner Profile", so the tab disagreed with the page.
        title = `Adult Dashboard | Classroom Screen ${APP_VERSION}`;
        description = "Configure learner cohorts, review speaking streaks, build dynamic worksheets, launch live peer-coordinated screens, and check student progress on Tutomy English Workspace.";
        keywords = "Tutorly Dashboard, Educator Hub, Cohort Management, Class Diagnostic, ESL Teaching Matrix";
      } else if (cleanPath.startsWith("/kids")) {
        title = "Tutorly Kids | Fun ESL Interactive Playground & Games";
        description = "Challenging English grammar quests, 3D survival ladders, board games, vocabulary wordwalls, and active combat arenas crafted precisely for kids.";
        keywords = "Kids ESL, Gamified Grammar, 3D Snake Ladder, Werewolf Game Education, Interactive Wordwall";
      } else if (cleanPath.startsWith("/library")) {
        title = "Tutomy Content Library | Multi-format ESL Resource Hub";
        description = "Instant lookup for ready-made English lesson sheets, vocabulary flipbooks, mock exams, audio speaking sessions, and custom worksheets designed for quick exports.";
        keywords = "ESL Content Bank, Printable Worksheets, English Vocabulary Flipbooks, Free Tutorly Resources";
      } else if (cleanPath.startsWith("/onboarding")) {
        title = `Get Started with Classroom Screen ${APP_VERSION} | Persona Setup Wizard`;
        description = "Personalize your classroom profile. Identify student cohorts, choose speech preferences, and align coursebook structures with smart pedagogical maps.";
      } else if (cleanPath.startsWith("/learner/")) {
        title = `Learner Analytics Profile Matrix | Classroom Screen ${APP_VERSION}`;
        description = "Review personalized diagnostics, competency achievements, speaking audio sessions logging, and progress charts in standard European CEFR frameworks.";
      } else if (cleanPath.startsWith("/group/")) {
        title = "Group Class Milestones & Interactive Report | Tutorly";
        description = "Track shared classroom strengths, attendance metrics, interactive collaboration logs, and joint learning path timelines for your student cohorts.";
      } else if (cleanPath.startsWith("/platform/")) {
        title = "School Content Platform & Core coursebook Syllabus";
        description = "Align standard global coursebook metrics directly with AI generators. Custom fit lesson templates with school syllabus parameters.";
      } else if (cleanPath.startsWith("/live/")) {
        title = "Tutorly Live Session Screen - Synchronized Class Board";
        description = "Join a real-time synchronized classroom. Draw on the whiteboard, play grammar games concurrently, and review diagnostic feedback live with your teacher.";
        ogType = "video.other";
      }

      // Update Native Elements
      document.title = title;
      
      // Update Meta Tags
      const updateMetaTag = (name: string, value: string, isProperty: boolean = false) => {
        let element = isProperty 
          ? document.querySelector(`meta[property="${name}"]`)
          : document.querySelector(`meta[name="${name}"]`);
          
        if (!element) {
          element = document.createElement('meta');
          if (isProperty) {
            element.setAttribute('property', name);
          } else {
            element.setAttribute('name', name);
          }
          document.head.appendChild(element);
        }
        element.setAttribute('content', value);
      };

      // Set Primary Tags
      updateMetaTag('description', description);
      updateMetaTag('keywords', keywords);
      
      // Set OpenGraph Tags
      const currentURL = window.location.origin + window.location.pathname + window.location.hash;
      updateMetaTag('og:title', title, true);
      updateMetaTag('og:description', description, true);
      updateMetaTag('og:url', currentURL, true);
      updateMetaTag('og:type', ogType, true);
      updateMetaTag('og:image', `${window.location.origin}/images/game-hero.jpg`, true);
      updateMetaTag('og:site_name', "Tutorly CSpro", true);

      // Set Twitter Tags
      updateMetaTag('twitter:card', 'summary_large_image');
      updateMetaTag('twitter:title', title);
      updateMetaTag('twitter:description', description);
      updateMetaTag('twitter:image', `${window.location.origin}/images/game-hero.jpg`);

      // Keep Canonical Link Up to Date
      let canonicalLink = document.querySelector('link[rel="canonical"]');
      if (!canonicalLink) {
        canonicalLink = document.createElement('link');
        canonicalLink.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalLink);
      }
      canonicalLink.setAttribute('href', currentURL);
    };

    handleSEOUpdate();
  }, [location]);

  return null;
};

export default SEOManager;
