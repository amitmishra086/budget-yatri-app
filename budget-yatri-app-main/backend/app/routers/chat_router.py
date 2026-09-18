"""AI Chat Assistant routes - free-form Q&A like 'Goa me 5000 me kya karu'."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.models import ChatMessage, User
from app.schemas.trip_schema import ChatRequest, ChatResponse
from app.services.deps import get_current_user
from app.services.ai_service import chat_with_assistant

router = APIRouter(prefix="/chat", tags=["AI Chat Assistant"])


@router.post("/", response_model=ChatResponse)
def send_message(
    chat_in: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Pull recent history for context (last 10 messages)
    recent = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.desc())
        .limit(10)
        .all()
    )
    history = [{"role": m.role, "content": m.content} for m in reversed(recent)]

    reply = chat_with_assistant(chat_in.message, history)

    # Save both user message and assistant reply
    db.add(ChatMessage(user_id=current_user.id, role="user", content=chat_in.message))
    db.add(ChatMessage(user_id=current_user.id, role="assistant", content=reply))
    db.commit()

    return ChatResponse(reply=reply)


@router.get("/history")
def get_chat_history(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    messages = (
        db.query(ChatMessage)
        .filter(ChatMessage.user_id == current_user.id)
        .order_by(ChatMessage.created_at.asc())
        .all()
    )
    return [{"role": m.role, "content": m.content, "created_at": m.created_at} for m in messages]
