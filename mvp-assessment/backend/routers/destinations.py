"""Destination CRUD routes with ownership and admin authorization."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import get_current_user, require_admin
from database import get_db
from models import Destination, User
from schemas import DestinationCreate, DestinationRead, DestinationUpdate

router = APIRouter(prefix="/destinations", tags=["destinations"])
DbSession = Annotated[Session, Depends(get_db)]


@router.post("", response_model=DestinationRead, status_code=status.HTTP_201_CREATED)
def create_destination(
    payload: DestinationCreate,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
):
    # Ownership is assigned from the verified JWT user, never accepted from the request body.
    values = payload.model_dump()
    if values["image_url"] is not None:
        values["image_url"] = str(values["image_url"])
    destination = Destination(**values, owner_id=current_user.id)
    db.add(destination)
    db.commit()
    db.refresh(destination)
    return destination


@router.get("", response_model=list[DestinationRead])
def list_destinations(db: DbSession):
    return db.scalars(select(Destination).order_by(Destination.id.desc())).all()


@router.get("/{destination_id}", response_model=DestinationRead)
def get_destination(destination_id: int, db: DbSession):
    destination = db.get(Destination, destination_id)
    if destination is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not found")
    return destination


def get_destination_for_owner_or_admin(
    destination_id: int,
    db: DbSession,
    current_user: Annotated[User, Depends(get_current_user)],
) -> Destination:
    """Load the record, then enforce owner-or-admin access before mutation."""
    destination = db.get(Destination, destination_id)
    if destination is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Destination not found")
    # Compare the owner ID from the database with the authenticated user ID. The role is
    # read from the database-backed User returned by get_current_user, not trusted from
    # client data or from an unverified token claim.
    if destination.owner_id != current_user.id and current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the owner or an admin may modify this destination")
    return destination


@router.put("/{destination_id}", response_model=DestinationRead)
def update_destination(
    payload: DestinationUpdate,
    destination: Annotated[Destination, Depends(get_destination_for_owner_or_admin)],
    db: DbSession,
):
    values = payload.model_dump()
    if values["image_url"] is not None:
        values["image_url"] = str(values["image_url"])
    for field, value in values.items():
        setattr(destination, field, value)
    db.commit()
    db.refresh(destination)
    return destination


@router.delete("/{destination_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_destination(
    destination: Annotated[Destination, Depends(get_destination_for_owner_or_admin)],
    db: DbSession,
):
    db.delete(destination)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
