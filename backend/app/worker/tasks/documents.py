from app.worker.celery_app import celery_app


@celery_app.task(name="app.worker.tasks.documents.generate_pdf")
def generate_pdf(document_payload: dict) -> dict:
    return {"queue": "documents", "result": "ok", "payload": document_payload}
