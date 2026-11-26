"""Authenticated group and membership management routes."""
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from auth import get_current_user
from database import get_db
from models import Group, GroupMember, User
from schemas import GroupCreate, GroupMemberAdd, GroupRead

router = APIRouter(prefix="/groups", tags=["groups"])
DbSession = Annotated[Session, Depends(get_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def group_response(db: Session, group: Group) -> dict:
    members = db.execute(
        select(GroupMember, User.email)
        .join(User, GroupMember.user_id == User.id)
        .where(GroupMember.group_id == group.id)
        .order_by(User.email)
    ).all()
    return {
        "id": group.id,
        "name": group.name,
        "owner_id": group.owner_id,
        "members": [
            {"user_id": member.user_id, "email": email, "role": member.role}
            for member, email in members
        ],
    }


def require_group_owner(db: Session, group_id: int, user_id: int) -> Group:
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    if group.owner_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the group owner can manage members or delete this group")
    return group


@router.post("", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def create_group(payload: GroupCreate, db: DbSession, current_user: CurrentUser):
    group = Group(name=payload.name.strip(), owner_id=current_user.id)
    if len(group.name) < 2:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Group name must contain at least 2 characters")
    db.add(group)
    db.flush()
    db.add(GroupMember(group_id=group.id, user_id=current_user.id, role="admin"))
    db.commit()
    db.refresh(group)
    return group_response(db, group)


@router.get("", response_model=list[GroupRead])
def list_groups(db: DbSession, current_user: CurrentUser):
    groups = db.scalars(
        select(Group)
        .join(GroupMember, GroupMember.group_id == Group.id)
        .where(GroupMember.user_id == current_user.id)
        .order_by(Group.id.desc())
    ).all()
    return [group_response(db, group) for group in groups]


@router.get("/{group_id}", response_model=GroupRead)
def get_group(group_id: int, db: DbSession, current_user: CurrentUser):
    group = db.get(Group, group_id)
    if group is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group not found")
    is_member = db.get(GroupMember, (group.id, current_user.id)) is not None
    if not is_member:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You are not a member of this group")
    return group_response(db, group)


@router.post("/{group_id}/members", response_model=GroupRead, status_code=status.HTTP_201_CREATED)
def add_group_member(group_id: int, payload: GroupMemberAdd, db: DbSession, current_user: CurrentUser):
    group = require_group_owner(db, group_id, current_user.id)
    invite_email = str(payload.email).lower()
    member = db.scalar(select(User).where(User.email == invite_email))
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No user has that email address")
    if db.get(GroupMember, (group.id, member.id)) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="This user is already a group member")
    db.add(GroupMember(group_id=group.id, user_id=member.id, role=payload.role))
    db.commit()
    return group_response(db, group)


@router.delete("/{group_id}/members/{user_id}", response_model=GroupRead)
def remove_group_member(group_id: int, user_id: int, db: DbSession, current_user: CurrentUser):
    group = require_group_owner(db, group_id, current_user.id)
    if user_id == group.owner_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The group owner cannot be removed")
    member = db.get(GroupMember, (group.id, user_id))
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Group member not found")
    db.delete(member)
    db.commit()
    return group_response(db, group)


@router.delete("/{group_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_group(group_id: int, db: DbSession, current_user: CurrentUser):
    group = require_group_owner(db, group_id, current_user.id)
    db.query(GroupMember).filter(GroupMember.group_id == group.id).delete(synchronize_session=False)
    db.delete(group)
    db.commit()
