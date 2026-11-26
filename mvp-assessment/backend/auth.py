"""Password hashing, JWT issuance, and role-based authorization helpers."""
import os
import hashlib
import secrets
from datetime import datetime, timedelta, timezone
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from models import AuthSession, User

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Set JWT_SECRET_KEY in the environment before starting the API")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
REFRESH_TOKEN_EXPIRE_DAYS = 7
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    # bcrypt salts and hashes the password; only this one-way hash is stored in the database.
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # passlib safely checks the supplied password against its stored bcrypt hash.
    return password_context.verify(plain_password, hashed_password)


def create_access_token(*, user_id: int, role: str, session_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # The signed token carries identity, expiry, and a revocable server-side session ID.
    return jwt.encode({"sub": str(user_id), "role": role, "sid": str(session_id), "exp": expires_at}, SECRET_KEY, algorithm=ALGORITHM)


def hash_refresh_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def create_auth_session(db: Session, user: User) -> tuple[AuthSession, str]:
    """Create a seven-day session and return the row plus its opaque cookie token."""
    refresh_token = secrets.token_urlsafe(48)
    session = AuthSession(
        user_id=user.id,
        refresh_token_hash=hash_refresh_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS),
    )
    db.add(session)
    db.flush()
    return session, refresh_token


def is_session_active(session: AuthSession | None) -> bool:
    if session is None or session.revoked_at is not None:
        return False
    expires_at = session.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    return expires_at > datetime.now(timezone.utc)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired access token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        # jwt.decode verifies the signature and exp claim before we trust the subject.
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        subject = payload.get("sub")
        user_id = int(subject) if subject is not None else None
        session_id = int(payload.get("sid"))
    except (JWTError, TypeError, ValueError):
        raise unauthorized
    if user_id is None:
        raise unauthorized
    session = db.get(AuthSession, session_id)
    if not is_session_active(session) or session.user_id != user_id:
        raise unauthorized
    user = db.get(User, user_id)
    if user is None or user.is_banned:
        raise unauthorized
    return user


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user
