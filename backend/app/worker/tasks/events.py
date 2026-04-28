import logging
import uuid as uuid_pkg

from app.db.session import SessionLocal
from app.events.handlers import register_event_handlers
from app.events.registry import event_registry
from app.models.domain_events import DomainEvent
from app.worker.celery_app import celery_app

logger = logging.getLogger(__name__)

register_event_handlers()


@celery_app.task(name="app.worker.tasks.events.process_domain_event_task")
def process_domain_event_task(domain_event_uuid: str) -> dict:
    db = SessionLocal()
    try:
        event = db.get(DomainEvent, uuid_pkg.UUID(domain_event_uuid))
        if event is None:
            return {"ok": False, "reason": "event_not_found"}
        payload = dict(event.payload)
        event_registry.dispatch(event.event_type, payload)
        return {"ok": True, "event_type": event.event_type}
    except Exception:
        logger.exception("domain_event_processing_failed")
        raise
    finally:
        db.close()
