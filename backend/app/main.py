import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import auth, hangars, fleet
from .middleware import RequestLoggingMiddleware
from .context import request_org_id


class _OrgFilter(logging.Filter):
    def filter(self, record):
        org = request_org_id.get()
        record.org_id = f"org={org}" if org is not None else "org=-"
        return True


def _setup_logging():
    fmt = "%(asctime)s %(levelname)-8s %(org_id)s %(message)s"
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter(fmt, datefmt="%Y-%m-%d %H:%M:%S"))
    handler.addFilter(_OrgFilter())
    root = logging.getLogger()
    root.handlers.clear()
    root.addHandler(handler)
    root.setLevel(logging.INFO)
    # Keep sqlalchemy engine logs at WARNING to avoid query spam; set to INFO to see all DB calls
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)


_setup_logging()

app = FastAPI(title="HangarSpace API")

app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(hangars.router)
app.include_router(fleet.router)


@app.get("/health")
async def health():
    return {"status": "ok"}
