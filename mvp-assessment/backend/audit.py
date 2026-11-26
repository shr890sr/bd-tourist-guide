"""Helpers for recording user and administrator activity."""

from models import AuditLog


def log_action(db, *, user_id: int | None, action: str, details: str, ip_address: str | None) -> None:
    """Stage an audit entry in the caller's transaction."""
    db.add(AuditLog(user_id=user_id, action=action, details=details, ip_address=ip_address))
