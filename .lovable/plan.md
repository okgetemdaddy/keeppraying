

# Cloudflare Worker Setup for KeepRead.ing

## What We're Doing
Creating a step-by-step guide document with the exact Cloudflare Worker script and configuration to proxy `keepread.ing` to your Lovable app — no code changes needed in the project itself.

## Key Points
- **Do NOT add `keepread.ing` as a custom domain in Lovable** — that causes the redirect problem
- The Worker proxies all requests to `keeppraying.lovable.app` while keeping `keepread.ing` in the browser URL
- Your existing `isKeepReading()` hostname detection + `KeepReadingShell` already handle the rest

## Deliverable
A downloadable setup guide (PDF or markdown) with:

1. **Cloudflare Worker script** — proxies requests from `keepread.ing` to `keeppraying.lovable.app`, preserving path/query/headers
2. **Worker Route configuration** — `keepread.ing/*` and `www.keepread.ing/*`
3. **DNS settings** — A records pointing to Cloudflare (already done based on screenshot)
4. **SSL/TLS settings** — Full (strict) mode recommendation
5. **Verification steps** — how to confirm it's working

## No Project Code Changes
Your app code is already correct. This is purely infrastructure configuration on the Cloudflare side.

