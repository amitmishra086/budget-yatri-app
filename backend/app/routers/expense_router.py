"""Expense tracking routes - only meaningful for low-budget trips, but works for any trip."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Expense, Trip, User
from app.schemas.trip_schema import ExpenseCreate, ExpenseOut, BudgetSummary
from app.services.deps import get_current_user

router = APIRouter(prefix="/expenses", tags=["Expenses / Budget Tracking"])


def _verify_trip_ownership(trip_id: int, user: User, db: Session) -> Trip:
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


@router.post("/", response_model=ExpenseOut, status_code=201)
def add_expense(
    expense_in: ExpenseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    _verify_trip_ownership(expense_in.trip_id, current_user, db)

    expense = Expense(
        trip_id=expense_in.trip_id,
        category=expense_in.category,
        amount=expense_in.amount,
        note=expense_in.note,
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return expense


@router.get("/trip/{trip_id}", response_model=List[ExpenseOut])
def list_expenses(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    _verify_trip_ownership(trip_id, current_user, db)
    return db.query(Expense).filter(Expense.trip_id == trip_id).order_by(Expense.created_at.desc()).all()


@router.get("/trip/{trip_id}/summary", response_model=BudgetSummary)
def budget_summary(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = _verify_trip_ownership(trip_id, current_user, db)
    expenses = db.query(Expense).filter(Expense.trip_id == trip_id).all()

    total_spent = sum(e.amount for e in expenses)
    by_category: dict = {}
    for e in expenses:
        by_category[e.category] = by_category.get(e.category, 0) + e.amount

    remaining = trip.budget_total - total_spent
    percent_used = round((total_spent / trip.budget_total) * 100, 1) if trip.budget_total > 0 else 0

    return BudgetSummary(
        trip_id=trip.id,
        budget_total=trip.budget_total,
        total_spent=total_spent,
        remaining=remaining,
        percent_used=percent_used,
        is_over_budget=total_spent > trip.budget_total,
        by_category=by_category,
    )


@router.delete("/{expense_id}", status_code=204)
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    expense = db.query(Expense).join(Trip).filter(
        Expense.id == expense_id, Trip.owner_id == current_user.id
    ).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found.")
    db.delete(expense)
    db.commit()
    return None
