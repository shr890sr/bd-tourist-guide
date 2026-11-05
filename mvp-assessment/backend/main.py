import os
from typing import Generator

from fastapi import Depends, FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from backend import models, schemas
from backend.database import Base, engine, get_db

app = FastAPI(
    title="BD Tourist Guide API",
    description="CRUD API for Bangladesh tourist destinations.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

@app.get("/api/destinations", response_model=list[schemas.DestinationRead])
def list_destinations(db: Session = Depends(get_db)):
    return db.query(models.Destination).all()

@app.get("/api/destinations/{destination_id}", response_model=schemas.DestinationRead)
def get_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    return destination

@app.post("/api/destinations", response_model=schemas.DestinationRead, status_code=status.HTTP_201_CREATED)
def create_destination(payload: schemas.DestinationCreate, db: Session = Depends(get_db)):
    destination = models.Destination(**payload.model_dump())
    db.add(destination)
    db.commit()
    db.refresh(destination)
    return destination

@app.put("/api/destinations/{destination_id}", response_model=schemas.DestinationRead)
def update_destination(destination_id: int, payload: schemas.DestinationUpdate, db: Session = Depends(get_db)):
    destination = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    for key, value in payload.model_dump().items():
        setattr(destination, key, value)
    
    db.commit()
    db.refresh(destination)
    return destination

@app.delete("/api/destinations/{destination_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_destination(destination_id: int, db: Session = Depends(get_db)):
    destination = db.query(models.Destination).filter(models.Destination.id == destination_id).first()
    if not destination:
        raise HTTPException(status_code=404, detail="Destination not found")
    
    db.delete(destination)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)