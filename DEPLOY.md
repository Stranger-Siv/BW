# Deploy BedWars Tournament to Render (bedwarstournament.online)

Follow these steps to deploy this Next.js app on [Render](https://render.com) and use your domain **bedwarstournament.online**.

---

## 1. Push your code to GitHub

If you haven’t already:

1. Create a new repo on [GitHub](https://github.com/new).
2. In your project folder, run:

   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
   git push -u origin main
   ```

Replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name.

---

## 2. Create a Web Service on Render

1. Go to [Render Dashboard](https://dashboard.render.com) and sign in (or sign up with GitHub).
2. Click **New +** → **Web Service**.
3. Connect your GitHub account if needed, then select the repo that contains this project.
4. Use these settings:

   | Field | Value |
   |--------|--------|
   | **Name** | `bedwars-tournament` (or any name you like) |
   | **Region** | Choose closest to your users |
   | **Branch** | `main` |
   | **Runtime** | `Node` |
   | **Build Command** | `npm install && npm run build` |
   | **Start Command** | `npm run start` |
   | **Instance Type** | Free (or paid if you need more resources) |

5. Click **Advanced** and add **Environment Variables** (see section 3 below). Add them now or right after creating the service.
6. Click **Create Web Service**. Render will clone the repo, run the build, and start the app. The first URL will be like `https://bedwars-tournament-xxxx.onrender.com`.

---

## 3. Environment variables

In the Render service → **Environment** tab, add:

| Key | Value | Notes |
|-----|--------|--------|
| `MONGO_URI` | Your MongoDB connection string | e.g. from [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) |
| `NEXTAUTH_SECRET` | A long random string | Generate with: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `https://bedwarstournament.online` | Use your real domain (or the Render URL until the domain is set) |
| `GOOGLE_CLIENT_ID` | Your Google OAuth client ID | From [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth client secret | Same place |

**Important:**

- **MongoDB:** Use a cloud DB (e.g. MongoDB Atlas). The connection string usually looks like:  
  `mongodb+srv://USER:PASSWORD@cluster.xxxxx.mongodb.net/DATABASE?retryWrites=true&w=majority`
- **Google OAuth:** In Google Cloud Console → APIs & Services → Credentials → your OAuth 2.0 Client:
  - Under **Authorized redirect URIs** add:  
    `https://bedwarstournament.online/api/auth/callback/google`  
  - After you add the custom domain on Render, use that exact URL. Until then you can add the Render URL:  
    `https://YOUR-SERVICE-NAME.onrender.com/api/auth/callback/google`
- After adding or changing env vars, use **Manual Deploy** → **Deploy latest commit** so the new values are used.

---

## 4. Add custom domain (bedwarstournament.online)

1. In Render: open your **Web Service** → **Settings** → **Custom Domains**.
2. Click **Add Custom Domain**.
3. Enter: `bedwarstournament.online` → Add.
4. Render will show you a **CNAME** (or A/AAAA) record, for example:
   - **Host:** `bedwarstournament` or `@` (depending on your DNS provider).
   - **Value / Target:** something like `bedwars-tournament-xxxx.onrender.com`.

5. In your **domain registrar** (where you bought bedwarstournament.online, e.g. Namecheap, GoDaddy, Cloudflare):
   - Add a **CNAME** record:
     - Name: `@` (root) or `bedwarstournament` (if your registrar uses subdomain only).
     - Target: the Render hostname from step 4 (e.g. `bedwars-tournament-xxxx.onrender.com`).
   - If the registrar does not allow CNAME on root (`@`), use Render’s **A** or **AAAA** records if shown, or use `www` as the host and add `www.bedwarstournament.online` on Render as well.

6. Optional: add `www.bedwarstournament.online` on Render and point it to the same service; then add a CNAME for `www` to the same Render hostname.

7. Wait 5–60 minutes for DNS to propagate. In Render, the domain will show as “Verified” when it’s correct.

8. Set **NEXTAUTH_URL** to your live URL:
   - `https://bedwarstournament.online`
   - (And in Google OAuth redirect URI, use `https://bedwarstournament.online/api/auth/callback/google`.)

9. Redeploy once so the app runs with the correct `NEXTAUTH_URL`.

---

## 5. HTTPS

Render provides HTTPS automatically for your Render URL and for verified custom domains. No extra step needed.

---

## 6. First admin user

After the app is live:

1. Sign in with Google once (using the account you want as admin).
2. In MongoDB (Atlas or your DB), find that user and set `role` to `"admin"`:

   ```javascript
   db.users.updateOne(
     { email: "your@gmail.com" },
     { $set: { role: "admin" } }
   )
   ```

3. Sign in again; you should see admin options (e.g. Dashboard, Tournaments in the nav).

---

## Quick checklist

- [ ] Code pushed to GitHub
- [ ] Web Service created on Render with correct Build/Start commands
- [ ] All env vars set (MONGO_URI, NEXTAUTH_SECRET, NEXTAUTH_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET)
- [ ] Google OAuth redirect URI updated to production URL
- [ ] Custom domain added on Render and DNS (CNAME/A) set at registrar
- [ ] NEXTAUTH_URL set to `https://bedwarstournament.online` and app redeployed
- [ ] First admin user set in MongoDB

If the build fails on Render, check the **Logs** tab for the exact error (e.g. missing env var or Node version). This project expects **Node 18+** (set in `package.json` under `engines`).
