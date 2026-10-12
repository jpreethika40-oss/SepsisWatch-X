"""
Database Engine and Session Configuration.
Supports asynchronous SQLAlchemy sessions for FastAPI and synchronous engines for migrations/scripts.
"""

import os
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import sessionmaker, Session
import yaml

from backend.app.db.base import Base

CONFIG_PATH = Path("config/config.yaml")
DB_URL = "sqlite+aiosqlite:///./data/sepsiswatch.db"
SYNC_DB_URL = "sqlite:///./data/sepsiswatch.db"

if CONFIG_PATH.exists():
    try:
        with open(CONFIG_PATH, "r") as f:
            cfg = yaml.safe_load(f)
            raw_url = cfg.get("app", {}).get("database_url", DB_URL)
            DB_URL = raw_url
            if DB_URL.startswith("sqlite+aiosqlite:///"):
                SYNC_DB_URL = DB_URL.replace("sqlite+aiosqlite:///", "sqlite:///")
            elif DB_URL.startswith("postgresql+asyncpg://"):
                SYNC_DB_URL = DB_URL.replace("postgresql+asyncpg://", "postgresql://")
    except Exception:
        pass

# Ensure data directory exists
Path("data").mkdir(exist_ok=True)

# Async Engine and Session
async_engine = create_async_engine(
    DB_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in DB_URL else {}
)

AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# Synchronous Engine (for seed scripts, testing and migrations)
sync_engine = create_engine(
    SYNC_DB_URL,
    echo=False,
    connect_args={"check_same_thread": False} if "sqlite" in SYNC_DB_URL else {}
)

SyncSessionLocal = sessionmaker(
    bind=sync_engine,
    class_=Session,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI Dependency for database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def init_db_sync():
    """Initializes tables synchronously."""
    Base.metadata.create_all(bind=sync_engine)


async def init_db_async():
    """Initializes tables asynchronously."""
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
