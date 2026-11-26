"""Admin-only user management routes."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import require_admin
from audit import log_action
from database import get_db
from models import AuditLog, User
from schemas import AuditLogRead, UserRead

router = APIRouter(prefix="/admin", tags=["admin"])
AdminUser = Annotated[User, Depends(require_admin)]
DbSession = Annotated[Session, Depends(get_db)]


@router.get("/users", response_model=list[UserRead])
def list_users(_admin: AdminUser, db: DbSession):
    # UserRead deliberately omits hashed_password so credential hashes never leave the API.
    return db.scalars(select(User).order_by(User.id)).all()


@router.put("/users/{user_id}/ban", response_model=UserRead)
def toggle_user_ban(user_id: int, admin: AdminUser, db: DbSession, request: Request):
    target = db.get(User, user_id)
    if target is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    next_banned_state = not target.is_banned
    # A currently unbanned admin cannot ban themselves or another admin. Admin accounts
    # can be unbanned by another admin if they were banned through an external DB action.
    if next_banned_state and (target.id == admin.id or target.role == "admin"):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot ban themselves or another admin")

    target.is_banned = next_banned_state
    log_action(
        db,
        user_id=admin.id,
        action="USER_BANNED" if next_banned_state else "USER_UNBANNED",
        details=f"{target.email} (user ID {target.id})",
        ip_address=request.client.host if request.client else None,
    )
    db.commit()
    db.refresh(target)
    return target


@router.get("/audit-logs", response_model=list[AuditLogRead])
def list_audit_logs(_admin: AdminUser, db: DbSession):
    rows = db.execute(
        select(AuditLog, User.email)
        .outerjoin(User, AuditLog.user_id == User.id)
        .order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
        .limit(200)
    ).all()
    return [
        {
            "id": log.id,
            "user_id": log.user_id,
            "user_email": email,
            "action": log.action,
            "details": log.details,
            "timestamp": log.timestamp,
            "ip_address": log.ip_address,
        }
        for log, email in rows
    ]
