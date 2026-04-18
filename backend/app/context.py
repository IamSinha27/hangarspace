from contextvars import ContextVar
from typing import Optional

request_org_id: ContextVar[Optional[int]] = ContextVar('request_org_id', default=None)
