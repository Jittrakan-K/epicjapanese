# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary user is the owner, Nuy: a Thai speaker learning Japanese on his own from zero, aiming to speak fluently in real life. He studies in short daily sessions on both phone and computer, logged into one account. Friends may use the site too, but they are not the target; decisions favour the owner's own daily learning.

## Product Purpose

Kana to N1 is a self-study site that takes a Thai learner from the kana through JLPT N1, all explained in Thai. Success means the learner can listen and speak Japanese comfortably in real situations. JLPT readiness is a useful by-product, not the goal: when speaking practice and exam coverage compete, speaking wins.

## Positioning

One free place, entirely in Thai, that pairs a station-by-station roadmap (kana, N5 to N1) with spaced repetition, speaking practice scored by the browser's speech recognition, and the full JLPT word and kanji lists with Thai meanings.

## Operating Context

- Daily routine: clear due review cards first, learn the next station on the map, then speaking practice (shadowing, role-play dialogues), then a short drill.
- Used on phone (home-screen icon, often offline) and on a computer with a better microphone.
- Progress syncs through the user's own account across devices.

## Capabilities and Constraints

- Static site on GitHub Pages (repo Jittrakan-K/epicjapanese): vanilla JS single-page app, hash routes, no build step.
- Must stay free: no paid APIs or services. Speech uses the browser's Web Speech API; accounts and sync use Firebase free tier.
- Login is username and password created in the site; never email. There is no password recovery because no email is stored.
- Content: roadmap of kana, N5 to N1 stations; 7,967 JLPT words and 2,211 kanji with Thai meanings; 471 grammar patterns; 31 dialogues; 15 reading passages; JLPT mock exams; placement test; pitch accent marks; animated stroke order; dark mode; offline support.
- Must work well on mobile and desktop.
- Grammar, dialogues, readings and Thai translations were written by Claude and may contain errors; corrections from the owner override them.

## Brand Commitments

- Name: "Kana to N1". Flat 2D Fuji mark in assets/mark.svg.
- Look must be 2D and must not read as AI-generated; the owner chose the Hallmark Sticker theme and wants it fun with light 2D animation.
- Interface language is Thai; Japanese appears as learning content.

## Evidence on Hand

- Open data with attribution: JLPT word lists (jlpt-word-list, MIT), KANJIDIC via kanji-data (MIT), pitch accent from Kanjium (CC BY-SA 4.0), stroke order from KanjiVG (CC BY-SA 3.0).
- No testimonials, user counts or exam results exist; do not invent any.

## Product Principles

1. Speaking first: every feature should move the learner toward listening and speaking, not just recognising.
2. Daily habit over volume: short sessions, a clear next step, review before new material.
3. Thai all the way: explanations, meanings and UI in Thai so nothing blocks a beginner.
4. Free and private: no paid services, no email, data stays with the learner's own account.
5. Phone-ready: everything must work one-handed on a phone, including offline.

## Accessibility & Inclusion

Thai-first copy; Japanese shown with readings and romaji toggles; reduced-motion respected; keyboard focus visible.
