"""Admin-only user management routes."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from backend.auth import require_admin
from backend.database import get_db
from backend.models import User
from backend.schemas import UserRead

router = APIRouter(prefix="/admin", tags=["admin"])
AdminUser = Annotated[User, Depends(require_admin)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/users", response_model=list[UserRead])
def list_users(_admin: AdminUser, db: DbSession):
    # UserRead deliberately omits hashed_password so credential hashes never leave the API.
    return db.scalars(select(User).order_by(User.id)).all()


@router.put("/users/{user_id}/ban", response_model=UserRead)
def toggle_user_ban(user_id: int, admin: AdminUser, db: DbSession):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    next_banned_state = not target.is_banned
    # A currently unbanned admin cannot ban themselves or another admin. Admin accounts
    # can be unbanned by another admin if they were banned through an external DB action.
    if next_banned_state and (target.id == admin.id or target.role == "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot ban themselves or another admin")

    target.is_banned = next_banned_state
    db.commit()
    db.refresh(target)
    return target
