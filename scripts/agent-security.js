#!/usr/bin/env node
/**
 * Agent 1 — Security Audit Agent
 * Run: npm run agent:security
 *
 * Scans the full codebase for security issues and saves a timestamped report.
 */

'use strict';

const { execSync }                     = require('child_process');
const { collectFiles, formatContext, saveReport } = require('./lib/collect');
const { runClaude }                    = require('./lib/run-claude');

console.log('🔒 Security Audit Agent starting…\n');

// ── 1. Collect codebase ───────────────────────────────────────────────────────
console.log('  → Reading codebase…');
const files   = collectFiles();
const context = formatContext(files);
console.log(`  → Collected ${files.length} files\n`);

// ── 2. Run dependency audit ───────────────────────────────────────────────────
let auditOutput = '';
console.log('  → Running pnpm audit…');
try {
  auditOutput = execSync('pnpm audit --json 2>/dev/null || true', {
    cwd:      require('./lib/collect').ROOT,
    encoding: 'utf8',
    timeout:  60_000,
  });
} catch {
  auditOutput = '(pnpm audit could not run or returned errors — check manually)';
}

// ── 3. Build prompt ───────────────────────────────────────────────────────────
const prompt = `
You are a senior application security engineer conducting a thorough security audit of a web application codebase.

The project is a pnpm monorepo with:
- apps/web  — Next.js 14 App Router frontend (TypeScript strict)
- apps/api  — NestJS backend with Prisma + PostgreSQL
- packages/shared — shared TypeScript types

Your task: produce a **comprehensive security audit report** covering every issue you find.

---

## DEPENDENCY VULNERABILITY SCAN OUTPUT (pnpm audit --json)

\`\`\`json
${auditOutput.slice(0, 8000)}
\`\`\`

---

## FULL CODEBASE

${context}

---

## AUDIT CHECKLIST — check every single item below

### 1. Secrets & Credentials
- Hardcoded API keys, tokens, passwords, or secrets anywhere in source code
- .env files committed or referenced in code in a way that leaks values
- JWT secrets or crypto keys that appear weak or in code
- Any credential visible in client-side bundles (NEXT_PUBLIC_ vars that expose secrets)

### 2. Authentication & Session Security
- Routes or API endpoints accessible without authentication that should be protected
- JWT implementation flaws (algorithm confusion, no expiry check, weak secret)
- OAuth callback handling — are state params validated? open redirect possible?
- Refresh token handling — httpOnly cookie used correctly?
- Missing or incorrect auth guards on NestJS controllers/routes
- Password hashing — is bcrypt used with sufficient rounds?

### 3. Input Validation & Injection
- Missing input sanitization on any user-controlled input
- XSS vectors — dangerouslySetInnerHTML, unescaped user content in JSX
- SQL injection risk — any raw query strings despite Prisma use
- NoSQL / header injection possibilities
- Email input validation before sending via Nodemailer

### 4. API & CORS Security
- CORS configuration — is it too permissive?
- Missing rate limiting on auth endpoints (login, register, password reset)
- Missing or weak request body size limits
- API routes that leak internal error details to the client

### 5. Environment & Configuration
- NEXT_PUBLIC_ variables that expose sensitive config to the browser
- NODE_ENV checks that could be bypassed
- Missing security headers (CSP, HSTS, X-Frame-Options, etc.)

### 6. Frontend Security
- Client-side auth state stored insecurely (localStorage vs httpOnly cookie)
- Links with target="_blank" missing rel="noopener noreferrer"
- Unvalidated redirects after OAuth callback

### 7. Dependency Vulnerabilities
- Interpret the pnpm audit output above
- Flag any HIGH or CRITICAL CVEs with affected package and recommended action

---

## REPORT FORMAT

Write the report in Markdown with this structure:

# Security Audit Report — Code Atlas
**Date:** ${new Date().toLocaleDateString('en-US', { dateStyle: 'long' })}
**Auditor:** Automated Security Agent

## Executive Summary
(2–3 sentences: overall posture, number of issues by severity)

## Critical Issues  🔴
(Issues that must be fixed before any production deployment)

## High Severity  🟠
(Issues that should be fixed soon)

## Medium Severity  🟡
(Issues to address in the near term)

## Low / Informational  🔵
(Minor improvements and notes)

## Dependency Vulnerabilities
(Summary of pnpm audit findings)

## What Looks Good ✅
(Security practices that are correctly implemented)

---

For each issue include:
- **File & line** (if identifiable)
- **What the problem is** (technical explanation)
- **Why it matters** (real-world impact)
- **Fix** (concrete code change or action)

Be thorough. Do not skip files. If something looks secure, say so in the "What Looks Good" section.
`.trim();

// ── 4. Call Claude ────────────────────────────────────────────────────────────
console.log('  → Sending to Claude for analysis (this may take 1–2 minutes)…\n');
let report;
try {
  report = runClaude(prompt, { timeout: 5 * 60 * 1000 });
} catch (err) {
  console.error('Claude call failed:', err.message);
  process.exit(1);
}

// ── 5. Save report ────────────────────────────────────────────────────────────
const reportPath = saveReport('security-audit', report);
console.log(`\n✅ Security audit complete!`);
console.log(`   Report saved → ${reportPath}\n`);
