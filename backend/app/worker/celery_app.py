from celery import Celery

from app.core.config import settings

celery_app = Celery("agrodoc", broker=settings.rabbitmq_url)
celery_app.conf.update(
    task_default_queue="events",
    task_queues={
        "documents": {"exchange": "documents", "routing_key": "documents"},
        "notifications": {"exchange": "notifications", "routing_key": "notifications"},
        "events": {"exchange": "events", "routing_key": "events"},
        "maintenance": {"exchange": "maintenance", "routing_key": "maintenance"},
    },
    task_routes={
        "app.worker.tasks.documents.*": {"queue": "documents"},
        "app.worker.tasks.notifications.*": {"queue": "notifications"},
        "app.worker.tasks.events.*": {"queue": "events"},
        "app.worker.tasks.maintenance.*": {"queue": "maintenance"},
    },
)

import app.worker.tasks.documents  # noqa: E402, F401
import app.worker.tasks.events  # noqa: E402, F401
import app.worker.tasks.maintenance  # noqa: E402, F401
import app.worker.tasks.notifications  # noqa: E402, F401
