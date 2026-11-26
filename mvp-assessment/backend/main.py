from fastapi import Depends, FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import schemas
from auth import create_access_token, get_current_user, hash_password, verify_password
from database import Base, engine, get_db
from models import User
from routers import admin as admin_router
from routers import destinations as destinations_router

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
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers keep the API paths grouped while sharing the application's /api prefix.
app.include_router(destinations_router.router, prefix="/api")
app.include_router(admin_router.router, prefix="/api")

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/auth/register", response_model=schemas.Token, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    email = str(payload.email).lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists")
    user = User(email=email, hashed_password=hash_password(payload.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"access_token": create_access_token(user_id=user.id, role=user.role), "role": user.role, "user": user}


@app.post("/api/auth/login", response_model=schemas.Token)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if user is None or not verify_password(payload.password, user.hashed_password) or user.is_banned:
        raise HTTPException(status_code=401, detail="Incorrect email or password", headers={"WWW-Authenticate": "Bearer"})
    return {"access_token": create_access_token(user_id=user.id, role=user.role), "role": user.role, "user": user}


@app.get("/api/auth/me", response_model=schemas.UserRead)
def read_current_user(current_user: User = Depends(get_current_user)):
    return current_user

