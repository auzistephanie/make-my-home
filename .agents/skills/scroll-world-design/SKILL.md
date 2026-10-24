---
name: scroll-world-design
description: Design scroll-driven cinematic miniature worlds for landing pages, reusing oso95/scroll-world methods with mobile-first, cost-controlled alternatives.
---
# Scroll World Design — AI Team adaptation

## Source of truth
Upstream: https://github.com/oso95/scroll-world
Official skill: https://github.com/oso95/scroll-world/tree/main/skills/scroll-world
Upstream license: MIT, Copyright (c) 2026 cyw.
This is an original, lightweight AI Team companion skill; it does not vendor the upstream source.

## When to use
For interactive scroll-driven landing pages, miniature city scenes, seamless scene transitions, parallax, and cinematic storytelling. Applicable across MakeMyHome and future projects.

## Workflow
1. Read the current site structure and assets. Preserve existing navigation, accessibility, content, analytics, calculators, and sign-in.
2. Ask for the intended scene sequence, art direction, target devices, and whether paid video generation is explicitly authorized.
3. Choose the least expensive feasible implementation:
   - Default: optimized static images (WebP/AVIF), layered parallax, CSS transforms, IntersectionObserver, and progressive enhancement.
   - Optional: small scroll-scrubbed videos when visual benefit justifies bytes and cost.
   - Full upstream generated-video pipeline only with explicit approval of provider, price, and asset budget.
4. Design a coherent continuous journey; verify transitions on mobile and desktop.
5. Respect prefers-reduced-motion, keyboard access, contrast, touch targets, image alt text, loading states, and low-bandwidth fallback.
6. Test mobile Safari/Chrome, image payload, LCP, CLS, and interaction smoothness; document measured results rather than assuming.
7. Create an isolated branch and preview. Never modify production, credentials, deployment protection, or paid services without approval.

## MakeMyHome visual brief
- Direction: realistic miniature Hong Kong street diorama, warm cinematic light, retro tong lau, real architectural detail, tasteful depth of field.
- Journey: renovation-trap street walk → choose tong lau / village house / estate → push into miniature interior → identify hidden traps → before/after → practical tools.
- Retain existing Cantonese branding “裝修無伏”, calculators, guide, dictionary, and auth.
- Avoid full heavyweight WebGL or mandatory large video downloads on phones.
- Prototype: miniature-preview.html on preview/miniature-hk-landing branch.

## Upstream installation for Codex
```bash
npx skills add oso95/scroll-world -a codex
```
Install only when the user authorizes installation. Installing a skill is separate from generating assets; paid external API access requires separate consent.

## Acceptance criteria
Visually coherent miniature HK identity; all existing product flows intact; mobile responsive; reduced-motion fallback; no unapproved external spend; preview-only until explicit release approval.
