from datetime import datetime, timezone
import os

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import schemas
from auth import (
    REFRESH_TOKEN_EXPIRE_DAYS,
    create_access_token,
    create_auth_session,
    get_current_user,
    hash_password,
    hash_refresh_token,
    is_session_active,
    verify_password,
)
from audit import log_action
from database import Base, engine, get_db
from models import AuthSession, User
from routers import admin as admin_router
from routers import destinations as destinations_router
from routers import groups as groups_router

Base.metadata.create_all(bind=engine)
# create_all creates new tables but does not alter existing ones. Add the ownership
# column for databases that already had destinations before this phase.
if engine.dialect.name == "postgresql":
    with engine.begin() as connection:
        connection.execute(text(
            "ALTER TABLE destinations ADD COLUMN IF NOT EXISTS owner_id "
            "INTEGER REFERENCES users(id) ON DELETE SET NULL"
        ))

app = FastAPI(
    title="BD Tourist Guide API",
    description="CRUD API for Bangladesh tourist destinations.",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5174,http://127.0.0.1:5174,http://localhost:5173,http://127.0.0.1:5173",
    ).split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

REFRESH_COOKIE = "refresh_token"
REFRESH_COOKIE_PATH = "/api/auth"


def refresh_cookie_samesite(request: Request) -> str:
    # Cross-origin frontend/API deployments need the cookie on credentialed XHRs.
    return "none" if request.url.scheme == "https" else "lax"


def set_refresh_cookie(response: Response, request: Request, refresh_token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        max_age=REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60,
        httponly=True,
        secure=request.url.scheme == "https",
        samesite=refresh_cookie_samesite(request),
        path=REFRESH_COOKIE_PATH,
    )

# Routers keep the API paths grouped while sharing the application's /api prefix.
app.include_router(destinations_router.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")
app.include_router(groups_router.router, prefix="/api")

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, request: Request, response: Response, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.flush()
    log_action(db, user_id=user.id, action="USER_REGISTERED", details=f"Registered account {user.email}", ip_address=request.client.host if request.client else None)
    session, refresh_token = create_auth_session(db, user)
    db.commit()
    db.refresh(user)
    set_refresh_cookie(response, request, refresh_token)
    return {"access_token": create_access_token(user_id=user.id, role=user.role, session_id=session.id), "role": user.role, "user": user}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, request: Request, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password) or user.is_banned:
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    log_action(db, user_id=user.id, action="USER_LOGIN", details=f"Logged in as {user.email}", ip_address=request.client.host if request.client else None)
    session, refresh_token = create_auth_session(db, user)
    db.commit()
    set_refresh_cookie(response, request, refresh_token)
    return {"access_token": create_access_token(user_id=user.id, role=user.role, session_id=session.id), "role": user.role, "user": user}


@app.post("/api/auth/refresh")
def refresh_access_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    session = db.query(AuthSession).filter(
        AuthSession.refresh_token_hash == hash_refresh_token(refresh_token or "")
    ).first()
    if not refresh_token or not is_session_active(session):
        response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, httponly=True, secure=request.url.scheme == "https", samesite=refresh_cookie_samesite(request))
        response.status_code = status.HTTP_401_UNAUTHORIZED
        return {"detail": "Refresh session is invalid or expired"}
    user = db.get(User, session.user_id)
    if user is None or user.is_banned:
        session.revoked_at = datetime.now(timezone.utc)
        db.commit()
        response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, httponly=True, secure=request.url.scheme == "https", samesite=refresh_cookie_samesite(request))
        response.status_code = status.HTTP_401_UNAUTHORIZED
        return {"detail": "Refresh session is invalid or expired"}
    return {"access_token": create_access_token(user_id=user.id, role=user.role, session_id=session.id), "token_type": "bearer"}


@app.post("/api/auth/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get(REFRESH_COOKIE)
    if refresh_token:
        session = db.query(AuthSession).filter(
            AuthSession.refresh_token_hash == hash_refresh_token(refresh_token)
        ).first()
        if session is not None and session.revoked_at is None:
            session.revoked_at = datetime.now(timezone.utc)
            db.commit()
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, httponly=True, secure=request.url.scheme == "https", samesite=refresh_cookie_samesite(request))
    return response


@app.get("/api/auth/me", response_model=schemas.UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user


@app.put("/api/auth/profile", response_model=schemas.UserRead)
def update_profile(
    payload: schemas.ProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    email = str(payload.email).lower()
    existing_user = db.query(User).filter(User.email == email, User.id != current_user.id).first()
    if existing_user:
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    current_user.email = email
    db.commit()
    db.refresh(current_user)
    return current_user


@app.put("/api/auth/change-password", status_code=status.HTTP_204_NO_CONTENT)
def change_password(
    payload: schemas.PasswordChange,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()

