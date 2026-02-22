# If Your Site Is Flagged as "Dangerous"

Browsers (e.g. Chrome) or Google Safe Browsing may show a "Dangerous" or "Deceptive site" warning. The codebase is now hardened; getting the flag **removed** usually requires you to request a review and fix any server/hosting issues.

---

## 1. Request a Google Safe Browsing Review

- Go to: **https://safebrowsing.google.com/safebrowsing/report_error/**
- Enter your URL: `https://bedwarstournament.online`
- Describe that this is your legitimate tournament site (e.g. "BedWars tournament registration and match management for MCFleet. We use Google OAuth only; no phishing or malware.")
- Submit. Google may take from a few hours to a few days to re-check and remove the warning if the site is clean.

---

## 2. What We’ve Already Done in Code

- **No inline scripts** – Removed `dangerouslySetInnerHTML` from layout; dark theme is set via server-rendered `class="dark"` on `<html>`.
- **Open redirect fixed** – Onboarding `returnUrl` is validated (path-only, no `//` or external URLs).
- **Security headers** – `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`, and `Content-Security-Policy` are set in `next.config.js`.
- **Admin APIs protected** – All `/api/admin/*` routes require an authenticated admin/super_admin session.
- **Unused dependency removed** – Removed the unused `discord` package.
- **security.txt** – Added at `/.well-known/security.txt` so security researchers and Google can see a contact. **Update it:** replace `YOUR_SECURITY_EMAIL@example.com` with a real email and set a proper `Expires` date.

---

## 3. Check Hosting and Server

- **HTTPS only** – The site must be served only over HTTPS. If your host (e.g. Render, Vercel) has “Force HTTPS” or “SSL”, enable it.
- **No malware on the server** – If the host or server was compromised, Safe Browsing may keep flagging the domain until the server is cleaned and passwords/keys rotated.
- **Domain / DNS** – If the domain was previously used for phishing or malware, the reputation can take time to recover; the review request helps.

---

## 4. Update security.txt

Edit **`public/.well-known/security.txt`**:

- Set `Contact:` to a real email (e.g. `mailto:your@email.com`).
- Set `Expires:` to a future date (e.g. one year from now in ISO 8601 format).
- Optionally set `Canonical:` to your exact production URL.

After deploy, confirm: **https://bedwarstournament.online/.well-known/security.txt**

---

## 5. Optional: HSTS

We added `Strict-Transport-Security` (HSTS) in `next.config.js`. That tells browsers to use HTTPS only. If you ever need to serve the site over HTTP (e.g. local or a special deploy), you can temporarily remove that header in `next.config.js` to avoid connection refusals.

---

## 6. If the Warning Persists

- Re-submit the Safe Browsing review form with the same URL and a short note that you’ve fixed issues and request a re-scan.
- Check **Google Search Console** (https://search.google.com/search-console) for the domain; the “Security issues” section may list what Google thinks is wrong.
- Ensure no other pages or subdomains (e.g. `www`, staging) are serving malicious or deceptive content.

Once the domain is clean and the review is processed, the “Dangerous” warning should be removed for most users.
