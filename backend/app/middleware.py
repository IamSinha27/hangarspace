import time
import logging
from jose import JWTError, jwt
from starlette.middleware.base import BaseHTTPMiddleware

from .context import request_org_id
from .auth.utils import SECRET_KEY, ALGORITHM

logger = logging.getLogger(__name__)


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        org_id = None
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            try:
                payload = jwt.decode(auth[7:], SECRET_KEY, algorithms=[ALGORITHM])
                org_id = payload.get("org_id")
            except JWTError:
                pass

        token = request_org_id.set(org_id)
        start = time.perf_counter()
        try:
            response = await call_next(request)
            duration_ms = int((time.perf_counter() - start) * 1000)
            logger.info(
                "method=%s path=%s status=%d duration=%dms",
                request.method, request.url.path, response.status_code, duration_ms,
            )
            return response
        finally:
            request_org_id.reset(token)
