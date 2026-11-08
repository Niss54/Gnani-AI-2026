# 🚀 RevClaim AI — One-Click Production Deployment Guide
### *Zero-Friction Cloud Deployment for Vercel (Frontend) and Render (Backend)*

This guide provides step-by-step instructions for deploying RevClaim AI to **Vercel** and **Render**.

---

## ⚡ Option A: Deploying Frontend to Vercel (Recommended in <2 Mins)

The frontend is a modern **Next.js 15 (App Router)** application located in the `frontend/` directory with root configuration via `vercel.json`.

### Step 1: Connect GitHub Repository
1. Log in to [vercel.com](https://vercel.com).
2. Click **"Add New..."** ➔ **"Project"**.
3. Select your repository: `Niss54/Gnani-AI-2026`.

### Step 2: Configure Project Settings
- **Framework Preset:** `Next.js`
- **Root Directory:** Edit and select `frontend` (or keep `./` as `vercel.json` in root automatically redirects to `frontend`).
- **Build Command:** `npm run build`
- **Output Directory:** `.next`

### Step 3: Add Environment Variables
In the Vercel **Environment Variables** panel, add the following (copy values from your `.env`):
```ini
NEXT_PUBLIC_SUPABASE_URL=https://grrevnmefwdjcydcztba.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_supabase_anon_key>
NEXT_PUBLIC_LIVEKIT_URL=wss://ravclaim-ai-qe4u52dy.livekit.cloud
NEXT_PUBLIC_RAZORPAY_KEY_ID=<your_razorpay_key_id>
NEXT_PUBLIC_APP_URL=https://<your-vercel-domain>.vercel.app

# Server-Side APIs (Never exposed to client)
SUPABASE_SERVICE_ROLE_KEY=<your_supabase_service_role_key>
GROQ_API_KEY=<your_groq_api_key>
GNANI_API_KEY=<your_gnani_api_key>
LIVEKIT_API_KEY=<your_livekit_api_key>
LIVEKIT_API_SECRET=<your_livekit_api_secret>
RAZORPAY_KEY_ID=<your_razorpay_key_id>
RAZORPAY_KEY_SECRET=<your_razorpay_key_secret>
RESEND_API_KEY=<your_resend_api_key>
BHASHINI_USER_ID=<your_bhashini_user_id>
BHASHINI_API_KEY=<your_bhashini_api_key>
BHASHINI_INFERENCE_KEY=<your_bhashini_inference_key>
```

### Step 4: Click Deploy!
- Deployment finishes in ~60 seconds.
- You will receive a live URL: `https://revclaim-ai.vercel.app`.

---

## 🐍 Option B: Deploying Python Backend to Render

The repository includes a ready-to-use `render.yaml` Infrastructure-as-Code Blueprint and `backend/Dockerfile`.

### Method 1: Using Render Blueprint (`render.yaml`)
1. Log in to [dashboard.render.com](https://dashboard.render.com).
2. Click **"New +"** ➔ **"Blueprint"**.
3. Select `Niss54/Gnani-AI-2026`.
4. Render will parse `render.yaml` and provision:
   - `revclaim-ai-backend` (FastAPI Python 3.11 web service)
   - `revclaim-ai-frontend` (Optional Next.js web service)
5. Fill in the prompted secret environment variables.
6. Click **"Apply"**.

### Method 2: Manual Web Service Setup
1. Click **"New Web Service"** on Render.
2. Select your repository `Niss54/Gnani-AI-2026`.
3. Set:
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/health`
4. Add environment variables from `backend/.env`.
5. Click **"Create Web Service"**.

---

## 🛡️ Pre-Flight Verification Checklist
Before submitting the live link:
- [x] Zero hardcoded secrets in source files or commits.
- [x] Webhook endpoint `/api/webhook/razorpay` reachable via HTTPS.
- [x] `node tests/e2e.test.mjs` returns `9/9 PASSED`.
- [x] Cockpit loads at `http://localhost:3000` or production domain without console errors.
