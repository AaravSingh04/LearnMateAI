"""LearnMate AI standalone server runner."""
import sys
import uvicorn

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    print(f"Starting LearnMate AI server on http://127.0.0.1:{port}...")
    uvicorn.run("backend.main:app", host="127.0.0.1", port=port, reload=True, log_level="info")
