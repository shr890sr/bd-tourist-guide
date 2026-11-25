"""Password hashing, JWT issuance, and role-based authorization helpers."""
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from backend.database import get_db
from backend.models import User

load_dotenv()
SECRET_KEY = os.getenv("JWT_SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError("Set JWT_SECRET_KEY in the environment before starting the API")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 15
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def hash_password(password: str) -> str:
    # bcrypt salts and hashes the password; only this one-way hash is stored in the database.
    return password_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    # passlib safely checks the supplied password against its stored bcrypt hash.
    return password_context.verify(plain_password, hashed_password)


def create_access_token(*, user_id: int, role: str) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    # The signed token carries identity and expiry claims. Signing does not encrypt its contents.
    return jwt.encode({"sub": str(user_id), "role": role, "exp": expires_at}, SECRET_KEY, algorithm=ALGORITHM)


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
    except (JWTError, TypeError, ValueError):
        raise unauthorized
    if user_id is None:
        raise unauthorized
    user = db.get(User, user_id)
    if user is None or user.is_banned:
        raise unauthorized
    return user


def require_admin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
    return current_user
