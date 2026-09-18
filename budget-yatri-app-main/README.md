# 🧳 Budget Yatri — AI Travel Planner & Budget Tracker

Ek full-stack web app jo AI ki help se budget-friendly trips plan karne me madad karta hai — destinations, food, budget hotels suggest karta hai, aur agar budget tight hai to expenses bhi track karta hai.

## ✨ Features

- 🔐 **Login/Signup** — JWT-based authentication
- 🗺️ **Trip Planner** — Destination, days, budget daalo → AI day-wise itinerary banayega
- 💬 **AI Chat Assistant** — "Goa me 5000 me kya karu" jaise sawal poocho
- 🎯 **Smart Budget Tracking** — Tight budget trips ke liye automatic expense tracker (category-wise: transport, hotel, food, activities)
- 📋 **Trip History** — Saare pehle ke trips dekho

## 🛠️ Tech Stack

- **Backend:** FastAPI (Python), SQLAlchemy ORM
- **Database:** SQLite (local dev) / PostgreSQL (production) — auto-switches based on `DATABASE_URL`
- **Auth:** JWT tokens + bcrypt password hashing
- **Frontend:** Vanilla HTML/CSS/JS (no framework, no build step needed)
- **AI:** Template-based mock engine by default; auto-upgrades to real Claude AI when you add an API key

---

## 📁 Project Structure

```
travel-budget-app/
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app entrypoint
│   │   ├── database.py          # DB connection (SQLite/PostgreSQL)
│   │   ├── models/models.py     # User, Trip, Expense, ChatMessage tables
│   │   ├── schemas/             # Pydantic request/response validation
│   │   ├── routers/             # auth, trips, expenses, chat endpoints
│   │   └── services/
│   │       ├── auth_service.py  # password hashing, JWT
│   │       ├── deps.py          # current-user dependency
│   │       └── ai_service.py    # AI suggestions (mock + real Claude)
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    ├── index.html
    ├── css/style.css
    └── js/
        ├── api.js               # backend API calls
        ├── auth.js               # login/signup logic
        └── app.js                # planner, trips, chat, budget tracker
```

---

## 🚀 Local Setup

### 1. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

pip install -r requirements.txt

cp .env.example .env            # then edit .env if needed

uvicorn app.main:app --reload --port 8000
```

Backend will run at `http://localhost:8000` — API docs auto-available at `http://localhost:8000/docs`.

This uses **SQLite by default** (`travel_budget.db` file gets created automatically) — no database setup needed for local testing.

### 2. Frontend

In a new terminal:

```bash
cd frontend
python -m http.server 8080
```

Open `http://localhost:8080` in your browser. Sign up, and start planning!

---

## 🤖 Enabling Real AI (Claude API)

Right now the app uses a **template/mock engine** for 4 destinations (Goa, Manali, Jaipur, Rishikesh) so it works instantly with zero setup. To unlock real AI for **any** destination:

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Install the SDK: `pip install anthropic`
3. Add it to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```
4. Restart the backend — that's it! No code changes needed. The app automatically detects the key and switches `ai_service.py` from mock mode to real Claude-powered responses for both the trip planner and chat assistant.

---

## 🌐 Deployment

### Database (PostgreSQL)
Use a free-tier provider:
- [Neon](https://neon.tech) (recommended, generous free tier)
- [Supabase](https://supabase.com)
- [Render PostgreSQL](https://render.com)

Copy the connection string they give you (looks like `postgresql://user:pass@host/dbname`).

### Backend (FastAPI)
Deploy to [Render](https://render.com) or [Railway](https://railway.app):

1. Push this repo to GitHub
2. Create a new **Web Service** pointing to the `backend/` folder
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Add environment variables:
   - `DATABASE_URL` = your PostgreSQL connection string
   - `SECRET_KEY` = a long random string (generate with `openssl rand -hex 32`)
   - `ANTHROPIC_API_KEY` = (optional, for real AI)

### Frontend
Deploy the `frontend/` folder to [Netlify](https://netlify.com), [Vercel](https://vercel.com), or [GitHub Pages](https://pages.github.com) (it's just static files — drag and drop works).

**Important:** After deploying the backend, open `frontend/js/api.js` and update this line with your real backend URL:

```js
: "https://YOUR-DEPLOYED-BACKEND-URL.com"; // <-- update this after deploying backend
```

---

## 📡 API Endpoints Reference

| Method | Endpoint | Description |
|--------|----------|--------------|
| POST | `/auth/signup` | Create new account |
| POST | `/auth/login` | Log in, get JWT token |
| POST | `/trips/` | Create trip + get AI itinerary |
| GET | `/trips/` | List your trips |
| GET | `/trips/{id}` | Get one trip |
| DELETE | `/trips/{id}` | Delete a trip |
| POST | `/expenses/` | Add an expense to a trip |
| GET | `/expenses/trip/{id}` | List expenses for a trip |
| GET | `/expenses/trip/{id}/summary` | Budget summary (spent/remaining/over-budget) |
| DELETE | `/expenses/{id}` | Delete an expense |
| POST | `/chat/` | Send message to AI assistant |
| GET | `/chat/history` | Get chat history |

Full interactive docs at `/docs` once the backend is running.

---

## 🧩 Extending This Project

- **Add more destinations:** edit `MOCK_DESTINATIONS` in `backend/app/services/ai_service.py`
- **Real hotel/place data:** integrate Google Places API inside `ai_service.py` alongside or instead of the AI suggestions
- **Email verification:** extend `auth_router.py` with an email-sending step
- **Trip sharing:** add a `shared_with` field on the Trip model for collaborative planning
