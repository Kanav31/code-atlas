#!/usr/bin/env node
/**
 * Agent 3 — Google Engineer Client Feedback Agent
 * Run: npm run agent:client
 *
 * Reviews the learning content and simulations from the perspective of a
 * senior Google engineer evaluating technical accuracy and educational depth.
 * Saves a timestamped report.
 */

'use strict';

const { collectFiles, formatContext, saveReport } = require('./lib/collect');
const { runClaude }                               = require('./lib/run-claude');

console.log('🔬 Google Engineer Client Feedback Agent starting…\n');

// ── 1. Collect only the content & visualizer files ────────────────────────────
// We want the actual learning content — understand, deepdive, interview, playground files
console.log('  → Reading content and visualizer files…');

const contentIncludes = [
  'visualizer/pages',
  'visualizer/shared',
  'apps/api/src',          // include backend to verify API design matches content
  'packages/shared',
];

const files   = collectFiles(undefined, contentIncludes);
const context = formatContext(files);
console.log(`  → Collected ${files.length} files\n`);

// ── 2. Build prompt ───────────────────────────────────────────────────────────
const prompt = `
You are a senior software engineer at Google with 12+ years of experience building large-scale distributed systems. You have designed infrastructure used by hundreds of millions of users. You regularly conduct system design interviews for senior and staff engineers. You are deeply familiar with how Kafka, databases, caching, APIs, real-time systems, and scalability patterns work in production at Google, Amazon, and Meta.

You have been asked to evaluate **Code Atlas** — an interactive education platform designed to teach backend engineering concepts through live simulations, visualizers, and structured learning content.

Your role is to evaluate whether this platform is **technically accurate, educationally deep, and genuinely useful** for someone trying to master these systems at a senior engineer level. You are not here to be polite. You are here to give the same kind of honest, direct feedback you'd give in an internal design review.

---

## CONTENT FILES (the actual learning content and simulators)

${context}

---

## EVALUATION FRAMEWORK

For each of the six modules, evaluate all four sections. Be section-specific and module-specific — do not give generic feedback.

### The six modules to evaluate:
1. REST & gRPC (ApiPage)
2. Real-time / WebSockets (RealtimePage)
3. Kafka & Queues (KafkaPage)
4. Databases & Indexing (DbPage)
5. Scalability (ScalePage)
6. Caching (CachePage)

### For each module, evaluate these four sections:

---

#### Understand It Section
- Is the conceptual explanation technically accurate, or does it oversimplify in a way that creates misconceptions?
- Does it build genuine intuition, or does it just list facts a student could find on Wikipedia?
- Are the visual/diagram explanations actually helpful or are they misleading/incomplete?
- What is missing that a senior engineer would expect to be explained here?
- Would a junior engineer reading this come away with correct mental models, or subtly wrong ones?

#### Play With It (Simulator) Section
- Does the simulation reflect how the real system actually behaves in production?
- Are failure modes and edge cases represented, or is it only the happy path?
- Would a real engineer learn something genuinely useful from this interaction, or does it feel like a toy?
- What scenarios, controls, or behaviors are missing that would make this simulation actually educational?
- Are the numbers, latencies, and behaviors shown realistic or invented?

#### Deep Dive Section
- Is the depth sufficient for someone who wants to go beyond surface level?
- Are trade-offs, internals, and real-world nuances actually covered?
- Does the content reference or align with how these systems actually work at scale at companies like Google?
- What topics are glossed over or missing entirely that a senior engineer would expect to see?
- Is there anything that's technically incorrect at this level of depth?

#### Interview Prep Section
- Are these questions representative of what actually gets asked in system design interviews at top tech companies (Google, Meta, Amazon, Stripe)?
- Are the answers and explanations strong enough to help someone pass a senior or staff-level interview?
- Is anything outdated, too basic, or missing from what interviewers actually care about today?
- What questions that are commonly asked are completely absent?
- Are the sample answers the level of depth an interviewer would expect, or are they surface-level?

---

## REPORT FORMAT

Write the report in Markdown. This should read like a technical design review document — direct, structured, with clear reasoning. No sugarcoating. No filler. Prioritize by impact.

# Technical Content Review — Code Atlas
**Date:** ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
**Reviewer:** Google Senior Engineer Perspective (Automated Agent)

## Executive Summary
(4–5 sentences: overall technical quality assessment, what works, what's dangerously wrong, and the one or two most urgent things to fix)

---

## Critical Technical Inaccuracies 🔴
(Things that are factually wrong or that would create incorrect mental models — fix these first)

---

## Module-by-Module Feedback

### 1. REST & gRPC
#### Understand It
#### Play With It
#### Deep Dive
#### Interview Prep

### 2. Real-time / WebSockets
#### Understand It
#### Play With It
#### Deep Dive
#### Interview Prep

### 3. Kafka & Queues
#### Understand It
#### Play With It
#### Deep Dive
#### Interview Prep

### 4. Databases & Indexing
#### Understand It
#### Play With It
#### Deep Dive
#### Interview Prep

### 5. Scalability
#### Understand It
#### Play With It
#### Deep Dive
#### Interview Prep

### 6. Caching
#### Understand It
#### Play With It
#### Deep Dive
#### Interview Prep

---

## What's Actually Good ✅
(Content that is technically solid and educationally sound — be specific)

## The Three Things I Would Fix First
(If you could only do three things to dramatically improve the educational value of this platform, what would they be and why?)

## Missing Content That Should Exist
(Topics, concepts, or entire sections that are absent but would be expected by a senior engineer)
`.trim();

// ── 3. Call Claude ────────────────────────────────────────────────────────────
console.log('  → Sending to Claude for technical review (this may take 3–4 minutes)…\n');
let report;
try {
  report = runClaude(prompt, { timeout: 8 * 60 * 1000 });
} catch (err) {
  console.error('Claude call failed:', err.message);
  process.exit(1);
}

// ── 4. Save report ────────────────────────────────────────────────────────────
const reportPath = saveReport('client-feedback', report);
console.log(`\n✅ Client feedback review complete!`);
console.log(`   Report saved → ${reportPath}\n`);
