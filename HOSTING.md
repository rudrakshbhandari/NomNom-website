# Hosting NomNom at nomnom.cc (Vercel + GoDaddy)

This guide walks you through hosting the landing page on Vercel and connecting your GoDaddy domain.

---

## 1. Deploy to Vercel

### Option A: Import from GitHub (recommended)

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New** → **Project**.
3. Import `rudrakshbhandari/NomNom-website`.
4. Vercel auto-detects it as a static site. Click **Deploy**.
5. Wait ~30 seconds. You'll get a URL like `nomnom-website-xxx.vercel.app`.

### Option B: Deploy via CLI

```bash
npx vercel
```

Follow prompts, then run `npx vercel --prod` when ready for production.

---

## 2. Add Custom Domain in Vercel

1. Open your project on Vercel → **Settings** → **Domains**.
2. Enter `nomnom.cc` and click **Add**.
3. Vercel will show DNS records to configure. You'll see something like:

   | Type | Name | Value           |
   |------|------|-----------------|
   | A    | @    | 76.76.21.21     |
   | CNAME| www  | cname.vercel-dns.com |

---

## 3. Configure DNS in GoDaddy

1. Log in at [GoDaddy](https://www.godaddy.com) → **My Products**.
2. Find `nomnom.cc` → **DNS** or **Manage DNS**.
3. Edit or add these records:

   **Root domain (nomnom.cc):**
   - Type: **A**
   - Name: `@` (or leave blank for root)
   - Value: `216.198.79.1` (use the IP Vercel shows in your project settings)
   - TTL: 600 (or default)

   **www subdomain (www.nomnom.cc):**
   - Use the record Vercel shows for www (may be CNAME or A; check your Domains tab)
   - If CNAME: Name `www`, Value `cname.vercel-dns.com`

4. Remove conflicting records if you have an existing A or CNAME for `@` or `www`.
5. Save changes. DNS propagation can take 5–60 minutes.

---

## 4. Verify in Vercel

1. Back in Vercel → **Domains**, click **Refresh** after updating GoDaddy.
2. Wait for the domain status to turn green (Valid Configuration).
3. If it stays "Invalid", recheck:
   - GoDaddy DNS records match **exactly** what Vercel shows (copy from the Domains tab).
   - No typos in the A record IP or CNAME target.
   - Propagation time (up to an hour).

---

## 5. Optional: Redirect www to root

In Vercel → **Domains**, you can add both `nomnom.cc` and `www.nomnom.cc`, then set one as primary so the other redirects to it. Vercel handles this automatically once both are verified.

---

## Reference: Vercel DNS

**Use the exact values from your Vercel project → Settings → Domains.** Vercel may update IPs over time. As of 2025, the recommended A record is often `216.198.79.1`; older `76.76.21.21` may still work but prefer what Vercel displays.
