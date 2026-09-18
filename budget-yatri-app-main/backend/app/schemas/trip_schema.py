"""Pydantic schemas for request/response validation - Trips & Expenses."""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List


class TripCreate(BaseModel):
    destination: str
    days: int = Field(gt=0, le=90)
    travelers: int = Field(default=1, gt=0)
    budget_total: float = Field(gt=0)
    is_low_budget: bool = False


class TripOut(BaseModel):
    id: int
    destination: str
    days: int
    travelers: int
    budget_total: float
    is_low_budget: int
    itinerary_json: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ExpenseCreate(BaseModel):
    trip_id: int
    category: str  # transport, hotel, food, activities, misc
    amount: float = Field(gt=0)
    note: Optional[str] = None


class ExpenseOut(BaseModel):
    id: int
    trip_id: int
    category: str
    amount: float
    note: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BudgetSummary(BaseModel):
    trip_id: int
    budget_total: float
    total_spent: float
    remaining: float
    percent_used: float
    is_over_budget: bool
    by_category: dict


class ChatRequest(BaseModel):
    message: str


class ChatResponse(BaseModel):
    reply: str
