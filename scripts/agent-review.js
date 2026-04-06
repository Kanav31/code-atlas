#!/usr/bin/env node
/**
 * Agent 2 — Senior Engineer Review Agent
 * Run: npm run agent:review
 *
 * Reviews the codebase as a senior engineer would in a real code review
 * and saves a prioritized, timestamped report.
 */

'use strict';

const { collectFiles, formatContext, saveReport } = require('./lib/collect');
const { runClaude }                               = require('./lib/run-claude');

console.log('👨‍💻 Senior Engineer Review Agent starting…\n');

// ── 1. Collect codebase ───────────────────────────────────────────────────────
console.log('  → Reading codebase…');
const files   = collectFiles();
const context = formatContext(files);
console.log(`  → Collected ${files.length} files\n`);

// ── 2. Build prompt ───────────────────────────────────────────────────────────
const prompt = `
You are a senior software engineer with 10+ years of experience across full-stack web applications, distributed systems, and production engineering at scale. You are conducting a thorough code review of a codebase as if it were submitted for review before production launch.

The project is **Code Atlas** — an interactive backend/systems education platform. It is a pnpm monorepo:
- apps/web  — Next.js 14 App Router frontend (TypeScript strict, Tailwind CSS, shadcn/ui)
- apps/api  — NestJS backend (TypeScript strict, Prisma ORM, PostgreSQL, Passport.js auth)
- packages/shared — shared TypeScript types

---

## FULL CODEBASE

${context}

---

## REVIEW SCOPE

Review the entire codebase as a senior engineer. Cover all of these dimensions:

### 1. Code Quality & Architecture
- TypeScript usage — are types strict and meaningful, or are there any/unknown escapes, unnecessary casts?
- Component design — are components doing too much? Should anything be split or composed differently?
- Separation of concerns — is business logic leaking into UI components? Is the API layer clean?
- Dead code, unused imports, commented-out code left in
- Naming — are variables, functions, and files named clearly and consistently?
- Repetition — is the same logic duplicated across files that should be abstracted?

### 2. Performance
- React re-render traps — missing useMemo/useCallback, state shapes that trigger cascading renders
- Next.js-specific — misuse of 'use client' (things that should be server components), missing Suspense boundaries, waterfall data fetching
- API efficiency — N+1 queries in Prisma, missing select clauses fetching entire rows when only 2 fields are needed
- Animation and visualizer performance — are there memory leaks in useEffect? Are timers/RAF properly cleaned up?
- Bundle size concerns — heavy imports that could be lazy-loaded

### 3. Error Handling & Robustness
- Missing try/catch around async operations
- Unhandled promise rejections
- API error responses that don't reach the UI in a useful way
- Edge cases in auth flow (token expiry during a session, concurrent requests)
- What happens when the API is down — is the UI graceful?

### 4. UI/UX Issues
- Accessibility problems — missing aria labels, keyboard navigation, focus management
- Loading states — are there spinners or skeletons where needed? Or does the UI just "pop in"?
- Mobile responsiveness issues — anything that would break on small screens
- Empty states — what does the user see when there's no data?
- User flows that are confusing or broken

### 5. Real Code Review Comments
- Things that would get a "request changes" in a GitHub PR
- Patterns that work now but will cause pain as the codebase grows
- Things that are cleverly written but should be simpler
- Missing tests (note where they're most critically needed even if there are none yet)

---

## REPORT FORMAT

Write the report in Markdown with this exact structure. Be direct, specific, and cite exact files and line numbers where possible. Write the way a senior engineer actually writes in a review — not as a checklist, but as coherent, prioritized feedback with reasoning.

# Senior Engineer Code Review — Code Atlas
**Date:** ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
**Reviewer:** Automated Senior Engineer Agent

## Overall Assessment
(3–4 sentences. Be honest. What's the state of this codebase? What's impressive and what needs work before this ships?)

---

## P0 — Fix Before Launch 🚨
(Issues that would cause bugs, data loss, or security problems in production)

## P1 — High Priority 🔴
(Significant quality or performance problems that should be addressed soon)

## P2 — Medium Priority 🟠
(Code quality, architecture, and UX improvements worth making)

## P3 — Low Priority / Polish 🟡
(Minor improvements, nice-to-haves, and style notes)

---

## What's Done Well ✅
(Specific things that are well-implemented — be genuine, not generic)

## If I Were Pairing With You
(2–3 paragraphs of high-level advice — what you'd focus on first if you were working on this codebase together)
`.trim();

// ── 3. Call Claude ────────────────────────────────────────────────────────────
console.log('  → Sending to Claude for review (this may take 2–3 minutes)…\n');
let report;
try {
  report = runClaude(prompt, { timeout: 6 * 60 * 1000 });
} catch (err) {
  console.error('Claude call failed:', err.message);
  process.exit(1);
}

// ── 4. Save report ────────────────────────────────────────────────────────────
const reportPath = saveReport('engineer-review', report);
console.log(`\n✅ Engineer review complete!`);
console.log(`   Report saved → ${reportPath}\n`);
