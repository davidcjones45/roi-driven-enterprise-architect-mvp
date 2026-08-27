"""Local-only static server for the ROI-EA MVP.

Python's default MIME table on some Windows installations serves .mjs as
text/plain, which browsers reject for ES-module imports. This launcher keeps
the MVP local and supplies the required JavaScript MIME type.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from pathlib import Path
import json
import mimetypes
import os

from local_engagement_store import EngagementStore, ValidationError

ROOT = Path(__file__).resolve().parent
PORT = 8766
DATA_DIRECTORY = Path(os.environ.get("ROI_EA_DATA_DIR", ROOT / "local-data")).resolve()
STORE = EngagementStore(DATA_DIRECTORY)


class RoiEaHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        **mimetypes.types_map,
        ".mjs": "text/javascript",
        ".js": "text/javascript",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def send_json(self, status, payload):
        body = json.dumps(payload, sort_keys=True).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def read_json(self):
        size = int(self.headers.get("Content-Length", "0"))
        if size <= 0 or size > 262144:
            raise ValidationError("A JSON body up to 256 KiB is required.")
        try:
            body = json.loads(self.rfile.read(size).decode("utf-8"))
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValidationError("Body must be valid UTF-8 JSON.") from error
        if not isinstance(body, dict):
            raise ValidationError("JSON body must be an object.")
        return body

    def api_path(self):
        return urlparse(self.path).path.rstrip("/")

    def do_GET(self):
        path = self.api_path()
        if path == "/api/local/health":
            self.send_json(200, {"ok": True, "mode": "local_consulting", "data_directory": str(DATA_DIRECTORY)})
            return
        if path == "/api/engagements":
            self.send_json(200, {"engagements": STORE.list()})
            return
        if path.startswith("/api/engagements/"):
            parts = path.split("/")
            engagement_id = parts[3] if len(parts) > 3 else ""
            if len(parts) == 5 and parts[4] == "discovery":
                record = STORE.get(engagement_id)
                if not record:
                    self.send_json(404, {"error": "Engagement not found."})
                    return
                self.send_json(200, {"engagement_id": engagement_id, "discovery": record.get("discovery", {})})
                return
            if len(parts) == 5 and parts[4] == "evidence":
                evidence = STORE.list_evidence(engagement_id)
                if evidence is None:
                    self.send_json(404, {"error": "Engagement not found."})
                    return
                self.send_json(200, {"engagement_id": engagement_id, "evidence": evidence})
                return
            if len(parts) == 5 and parts[4] == "ai-necessity":
                record = STORE.get(engagement_id)
                if not record:
                    self.send_json(404, {"error": "Engagement not found."})
                    return
                self.send_json(200, {"engagement_id": engagement_id, "ai_necessity": record.get("ai_necessity", {})})
                return
            if len(parts) == 5 and parts[4] == "findings":
                records = STORE.findings_and_questions(engagement_id)
                if not records:
                    self.send_json(404, {"error": "Engagement not found."})
                    return
                self.send_json(200, records)
                return
            if len(parts) == 5 and parts[4] == "recommendation":
                record = STORE.get(engagement_id)
                if not record:
                    self.send_json(404, {"error": "Engagement not found."})
                    return
                self.send_json(200, {"engagement_id": engagement_id, "recommendation": record.get("recommendation", {}), "history": record.get("recommendation_history", [])})
                return
            if len(parts) == 5 and parts[4] == "snapshots":
                snapshots = STORE.list_snapshots(engagement_id)
                if snapshots is None:
                    self.send_json(404, {"error": "Engagement not found."})
                    return
                self.send_json(200, {"engagement_id": engagement_id, "snapshots": snapshots})
                return
            if len(parts) == 6 and parts[4] == "snapshots":
                snapshot = STORE.get_snapshot(engagement_id, parts[5])
                if not snapshot:
                    self.send_json(404, {"error": "Snapshot not found."})
                    return
                self.send_json(200, snapshot)
                return
            record = STORE.get(engagement_id)
            if not record:
                self.send_json(404, {"error": "Engagement not found."})
                return
            if len(parts) == 5 and parts[4] == "export":
                self.send_json(200, {"schema": "roi-ea-local-engagement-export-v0.1", "engagement": record})
                return
            if len(parts) == 4:
                self.send_json(200, record)
                return
        super().do_GET()

    def do_POST(self):
        path = self.api_path()
        try:
            if path == "/api/engagements":
                self.send_json(201, STORE.create(self.read_json()))
                return
            if path == "/api/engagements/import":
                body = self.read_json()
                record = body.get("engagement") if isinstance(body.get("engagement"), dict) else body
                self.send_json(201, STORE.create(record))
                return
            if path.startswith("/api/engagements/"):
                parts = path.split("/")
                if len(parts) == 5 and parts[4] == "discovery":
                    record = STORE.update_discovery(parts[3], self.read_json())
                    if not record:
                        self.send_json(404, {"error": "Engagement not found."})
                    else:
                        self.send_json(200, record)
                    return
                if len(parts) == 5 and parts[4] == "evidence":
                    evidence = STORE.add_evidence(parts[3], self.read_json())
                    if not evidence:
                        self.send_json(404, {"error": "Engagement not found."})
                        return
                    self.send_json(201, evidence)
                    return
                if len(parts) == 5 and parts[4] == "ai-necessity":
                    record = STORE.update_ai_necessity(parts[3], self.read_json())
                    if not record:
                        self.send_json(404, {"error": "Engagement not found."})
                        return
                    self.send_json(200, record)
                    return
                if len(parts) == 5 and parts[4] == "findings":
                    record = STORE.add_finding(parts[3], self.read_json())
                    if not record:
                        self.send_json(404, {"error": "Engagement not found."})
                        return
                    self.send_json(201, record)
                    return
                if len(parts) == 5 and parts[4] == "questions":
                    record = STORE.add_open_question(parts[3], self.read_json())
                    if not record:
                        self.send_json(404, {"error": "Engagement not found."})
                        return
                    self.send_json(201, record)
                    return
                if len(parts) == 5 and parts[4] == "recommendation":
                    record = STORE.record_recommendation(parts[3], self.read_json())
                    if not record:
                        self.send_json(404, {"error": "Engagement not found."})
                        return
                    self.send_json(201, record)
                    return
                if len(parts) == 5 and parts[4] == "recommendation-and-snapshot":
                    body = self.read_json()
                    result = STORE.record_recommendation_and_snapshot(parts[3], body.get("recommendation", {}), body.get("generated_report", {}))
                    if not result:
                        self.send_json(404, {"error": "Engagement not found."})
                        return
                    self.send_json(201, result)
                    return
                if len(parts) == 5 and parts[4] == "duplicate":
                    record = STORE.duplicate(parts[3])
                elif len(parts) == 5 and parts[4] == "archive":
                    record = STORE.archive(parts[3])
                else:
                    self.send_json(404, {"error": "Local route not found."})
                    return
                if not record:
                    self.send_json(404, {"error": "Engagement not found."})
                else:
                    self.send_json(201, record)
                return
            self.send_json(404, {"error": "Local route not found."})
        except ValidationError as error:
            self.send_json(400, {"error": str(error)})

    def do_PUT(self):
        path = self.api_path()
        if not path.startswith("/api/engagements/") or len(path.split("/")) != 4:
            self.send_json(404, {"error": "Local route not found."})
            return
        try:
            record = STORE.update(path.split("/")[3], self.read_json())
            if not record:
                self.send_json(404, {"error": "Engagement not found."})
            else:
                self.send_json(200, record)
        except ValidationError as error:
            self.send_json(400, {"error": str(error)})

    def do_DELETE(self):
        self.send_json(405, {"error": "Deletion is not available. Archive an engagement instead."})


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), RoiEaHandler)
    print(f"ROI-EA is serving at http://127.0.0.1:{PORT}/index.html")
    server.serve_forever()
