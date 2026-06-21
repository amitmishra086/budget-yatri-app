"""Trip planning routes: create trip with AI itinerary, list, get, delete."""
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import Trip, User
from app.schemas.trip_schema import TripCreate, TripOut
from app.services.deps import get_current_user
from app.services.ai_service import get_travel_suggestion

router = APIRouter(prefix="/trips", tags=["Trips"])


@router.post("/", response_model=TripOut, status_code=201)
def create_trip(
    trip_in: TripCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Auto-detect tight budget if user didn't explicitly flag it:
    # if budget per day is low, we mark it as low-budget for expense tracking
    suggestion = get_travel_suggestion(
        destination=trip_in.destination,
        days=trip_in.days,
        budget_total=trip_in.budget_total,
        travelers=trip_in.travelers,
    )

    budget_status = suggestion.get("budget_status", "")
    auto_is_low_budget = trip_in.is_low_budget or ("tight" in budget_status)

    trip = Trip(
        owner_id=current_user.id,
        destination=trip_in.destination,
        days=trip_in.days,
        travelers=trip_in.travelers,
        budget_total=trip_in.budget_total,
        is_low_budget=1 if auto_is_low_budget else 0,
        itinerary_json=json.dumps(suggestion),
    )
    db.add(trip)
    db.commit()
    db.refresh(trip)
    return trip


@router.get("/", response_model=List[TripOut])
def list_trips(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Trip).filter(Trip.owner_id == current_user.id).order_by(Trip.created_at.desc()).all()


@router.get("/{trip_id}", response_model=TripOut)
def get_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    return trip


@router.delete("/{trip_id}", status_code=204)
def delete_trip(trip_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    trip = db.query(Trip).filter(Trip.id == trip_id, Trip.owner_id == current_user.id).first()
    if not trip:
        raise HTTPException(status_code=404, detail="Trip not found.")
    db.delete(trip)
    db.commit()
    return None
