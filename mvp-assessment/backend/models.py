from sqlalchemy import Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

try:
    from .database import Base
except ImportError:  # Vercel loads this module as a top-level backend module.
    from database import Base


class Destination(Base):
    __tablename__ = "destinations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    location: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    image_url: Mapped[str | None] = mapped_column(String(2048), nullable=True)
