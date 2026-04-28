from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.notifications.send_email")
def send_email(notification_payload: dict) -> dict:
    return {"queue": "notifications", "result": "ok", "payload": notification_payload}
