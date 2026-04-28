from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.maintenance.cleanup")
def cleanup() -> dict:
    return {"queue": "maintenance", "result": "ok"}
