"""
SQLAlchemy 2.0 Base Configuration.
"""

from datetime import datetime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import DateTime, func


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy declarative models."""
    pass
