

## Create `/upload` — Burn-After-Open Secure File Ingress

### Concept

A zero-knowledge encrypted file upload page accessible only via single-use invite links. The URL contains a cryptographic token in the fragment; upon first valid load, the token is burned (invalidated server-side). A 4-digit Guest PIN is required to derive the final AES-256-GCM encryption key, ensuring the URL alone is never sufficient.

### Access Flow

```text
Admin generates link → /upload#<token>
                            │
                     ┌──────▼──────┐
                     │ Validate    │  Token lookup in upload_access_tokens
                     │ token       │  If used/expired/missing → "Link Expired" dead end
                     └──────┬──────┘
                            │ valid
                     ┌──────▼──────┐
                     │ Burn token  │  Mark used=true immediately (burn-after-open)
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │ Guest PIN   │  4-digit numeric input
                     │ entry       │  PIN is mixed into PBKDF2 salt for key derivation
                     └──────┬──────┘
                            │
                     ┌──────▼──────┐
                     │ Upload UI   │  Drag-and-drop zone, encrypt, transmit
                     └──────┘
```

No Supabase auth session required. No password cloak. The link itself is the credential, and it self-destructs on first use.

### Database Migration

**New table: `upload_access_tokens`** — separate from existing `invite_tokens` to keep concerns clean.

```sql
CREATE TABLE public.upload_access_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  label text,                    -- admin note ("for John's files")
  used boolean DEFAULT false,
  used_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '48 hours'),
  created_at timestamptz DEFAULT now(),
  created_by uuid               -- admin who generated the link
);
ALTER TABLE public.upload_access_tokens ENABLE ROW LEVEL SECURITY;

-- Anon can SELECT (to validate token) — but only unused, unexpired tokens
CREATE POLICY "Anon validate token" ON public.upload_access_tokens
  FOR SELECT TO anon USING (used = false AND expires_at > now());

-- Service role handles the burn (update used=true) via edge function
```

**New table: `admin_submissions`** — metadata for uploaded encrypted files.

```sql
CREATE TABLE public.admin_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token_id uuid REFERENCES public.upload_access_tokens(id),
  original_filename text NOT NULL,
  stored_path text NOT NULL,
  file_size_bytes bigint,
  encrypted boolean DEFAULT true,
  encryption_iv text,
  encryption_salt text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.admin_submissions ENABLE ROW LEVEL SECURITY;
-- No anon read — admin only via has_role or service role
CREATE POLICY "Admin read submissions" ON public.admin_submissions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
```

**New storage bucket:** `secure_ingress` (private).

### Edge Function: `burn-upload-token`

Validates the token, burns it (sets `used=true, used_at=now()`), and returns a short-lived signed upload URL for the `secure_ingress` bucket + inserts the `admin_submissions` row. Uses service role key so anon clients can't directly mutate the token table.

### New Files

| File | Purpose |
|------|---------|
| `src/pages/Upload.tsx` | Main page — token validation, PIN entry, encrypted upload UI |
| `src/lib/fileEncryption.ts` | AES-256-GCM encryption engine (Web Crypto API, PBKDF2 with PIN+salt) |
| `supabase/functions/burn-upload-token/index.ts` | Edge function to burn token + return signed upload URL |

### Upload.tsx Page States

1. **Loading** — extract token from `window.location.hash`, call edge function to validate & burn
2. **Expired/Invalid** — minimalist "This link has been used or expired" message, no further action possible
3. **PIN Entry** — 4-digit numeric input (large touch targets, iPad-optimized), Framer Motion fade-in
4. **Upload Zone** — Hero ("Secure Portal: Kingdom Assets Ingress"), SVG flow diagram (Raw → Encrypt → Vault with pulsing arrows), `react-dropzone` drag-and-drop area (100MB limit)
5. **Uploading** — progress indicator showing encryption + transmission
6. **Complete** — animated checkmark, "Securely Delivered" confirmation

### Encryption Flow (fileEncryption.ts)

- Generate random 16-byte salt and 12-byte IV
- Derive AES-256-GCM key via PBKDF2 using `PIN + salt` (100,000 iterations, SHA-256)
- Encrypt file ArrayBuffer → ciphertext
- Return `{ encryptedBlob, salt (hex), iv (hex) }` for storage alongside metadata
- Detailed JSDoc comments documenting the admin-side decryption procedure

### Routing (App.tsx)

```tsx
<Route path="/upload" element={<Upload />} />
```

Not behind AuthGate. Not in SiteNav or MobileTabBar. Accessible only via direct link.

### Admin Link Generation

Add a small section in the existing Admin page (or a new tab) where admins can generate upload links. Clicking "Generate" creates a row in `upload_access_tokens` and copies the `origin/upload#<token>` URL to clipboard.

### Dependencies

- `react-dropzone` (new install)
- `framer-motion` (already installed)
- `lucide-react` (already installed)

### Modified Files

| File | Change |
|------|--------|
| `src/App.tsx` | Add `/upload` route |
| `src/pages/Admin.tsx` | Add "Upload Links" generation UI (small addition) |

