import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

try:
    from backend.main import app
    handler = app
except Exception as e:
    import traceback
    err_tb = traceback.format_exc()
    print("STARTUP IMPORT ERROR:", err_tb)
    async def handler(scope, receive, send):
        if scope["type"] == "http":
            body = f"STARTUP ERROR:\n{err_tb}".encode("utf-8")
            await send({
                "type": "http.response.start",
                "status": 500,
                "headers": [
                    [b"content-type", b"text/plain; charset=utf-8"],
                    [b"content-length", str(len(body)).encode("utf-8")]
                ]
            })
            await send({
                "type": "http.response.body",
                "body": body
            })
