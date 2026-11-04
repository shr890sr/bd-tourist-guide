import os

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import select
from sqlalchemy.orm import Session

try:
    from . import models, schemas
    from .database import Base, engine, get_db
except ImportError:  # Vercel loads main.py from the backend service root.
    import models
    import schemas
    from database import Base, engine, get_db


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="BD Tourist Guide MVP API",
    description="CRUD API for Bangladesh tourist destinations.",
    version="1.0.0",
)

allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type"],
)


def list_destinations(db: Session):
    return db.scalars(select(models.Destination).order_by(models.Destination.name)).all()


def get_destination_or_404(db: Session, destination_id: int):
    destination = db.get(models.Destination, destination_id)
    if destination is None:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination


@app.get("/api/health", tags=["health"])
def health_check():
    return {"status": "ok"}


@app.post(
    "/api/destinations",
    response_model=schemas.DestinationRead,
    status_code=status.HTTP_201_CREATED,
    tags=["destinations"],
)
def create_destination(payload: schemas.DestinationCreate, db: Session = Depends(get_db)):
    destination = models.Destination(**payload.model_dump(mode="json"))
    db.add(destination)
    db.commit()
    db.refresh(destination)
    return destination


@app.get(
    "/api/destinations/{destination_id}",
    response_model=schemas.DestinationRead,
    tags=["destinations"],
)
def read_destination(destination_id: int, db: Session = Depends(get_db)):
    return get_destination_or_404(db, destination_id)


@app.get(
    "/api/destinations",
    response_model=list[schemas.DestinationRead],
    tags=["destinations"],
)
def read_destinations(db: Session = Depends(get_db)):
    return list_destinations(db)


@app.put(
    "/api/destinations/{destination_id}",
    response_model=schemas.DestinationRead,
    tags=["destinations"],
)
def update_destination(
    destination_id: int,
    payload: schemas.DestinationUpdate,
    db: Session = Depends(get_db),
):
    destination = get_destination_or_404(db, destination_id)
    for field, value in payload.model_dump(mode="json").items():
        setattr(destination, field, value)
    db.commit()
    db.refresh(destination)
    return destination


@app.delete(
    "/api/destinations/{destination_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
    tags=["destinations"],
)
def delete_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = get_destination_or_404(db, destination_id)
    db.delete(destination)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
