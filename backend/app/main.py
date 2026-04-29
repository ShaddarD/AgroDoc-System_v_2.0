from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin_accounts import router as admin_accounts_router
from app.api.applications import router as applications_router
from app.api.certificates_registry import router as certificates_registry_router
from app.api.audit_logs_list import router as audit_logs_router
from app.api.auth import router as auth_router
from app.api.files import router as files_router
from app.api.lookups import router as lookups_router
from app.core.config import settings

app = FastAPI(title="AgroDoc API", version="2.0.0")

_origins = [part.strip() for part in settings.cors_origins.split(",") if part.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(applications_router)
app.include_router(certificates_registry_router)
app.include_router(lookups_router)
app.include_router(files_router)
app.include_router(audit_logs_router)
app.include_router(admin_accounts_router)


@app.get("/health")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
