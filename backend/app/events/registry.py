from collections.abc import Callable


EventHandler = Callable[[dict], None]


class EventHandlerRegistry:
    def __init__(self) -> None:
        self._handlers: dict[str, list[EventHandler]] = {}

    def register(self, event_type: str, handler: EventHandler) -> None:
        self._handlers.setdefault(event_type, []).append(handler)

    def dispatch(self, event_type: str, payload: dict) -> None:
        for handler in self._handlers.get(event_type, []):
            handler(payload)


event_registry = EventHandlerRegistry()
