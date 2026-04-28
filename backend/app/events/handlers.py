import logging

from app.events.registry import event_registry

logger = logging.getLogger(__name__)

_handlers_registered = False


def register_event_handlers() -> None:
    global _handlers_registered
    if _handlers_registered:
        return
    event_registry.register("APPLICATION_STATUS_CHANGED", _log_status_change)
    event_registry.register("APPLICATION_CREATED", _log_application_created)
    _handlers_registered = True


def _log_status_change(payload: dict) -> None:
    logger.info("status_changed %s", payload)


def _log_application_created(payload: dict) -> None:
    logger.info("application_created %s", payload)
