from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.config import settings
from app.database import Base, engine
from app.reports.routes import router as reports_router
from app.tickets.routes import router as tickets_router
from app.agencies.models import Agency  # noqa: F401
from app.users.models import User  # noqa: F401
from app.tickets.models import Ticket, TicketUpdate  # noqa: F401

app = FastAPI(title="CivicFix API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


app.mount("/uploads", StaticFiles(directory=settings.upload_dir, check_dir=False), name="uploads")
app.include_router(reports_router, prefix="/api")
app.include_router(tickets_router, prefix="/api")
