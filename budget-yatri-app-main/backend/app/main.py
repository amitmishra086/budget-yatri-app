"""
Main FastAPI application entrypoint.

Run locally with:
    uvicorn app.main:app --reload

API docs available at /docs once running.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.database import Base, engine
from app.routers import auth_router, trip_router, expense_router, chat_router

# Create all DB tables on startup (safe to run repeatedly - won't recreate existing tables)
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Budget Travel Planner API",
    description="AI-powered travel planning with budget tracking for budget-conscious Indian travellers.",
    version="1.0.0",
)

# Allow frontend (any origin during dev - tighten this in production to your actual domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router)
app.include_router(trip_router.router)
app.include_router(expense_router.router)
app.include_router(chat_router.router)


@app.get("/")
def root():
    return {
        "message": "Budget Travel Planner API is running 🚀",
        "docs": "/docs",
    }


@app.get("/health")
def health_check():
    return {"status": "ok"}
