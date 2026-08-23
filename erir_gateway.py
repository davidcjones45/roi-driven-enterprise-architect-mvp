#!/usr/bin/env python3
"""Local-only boundary between the ROI-EA MVP and an ERIR working copy.

This is deliberately not a production API. It listens only on 127.0.0.1,
does not authenticate users, and never changes ERIR source, reviewed, or
approved records. It exposes read-only traceability and stores explicitly
requested, schema-validated draft packages in its own local data directory.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import uuid
from datetime import UTC, datetime
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

try:
    from jsonschema import Draft202012Validator, FormatChecker
    from referencing import Registry, Resource
except ImportError as exc:  # Clear, intentional setup boundary.
    raise SystemExit(
        "ERIR gateway requires jsonschema and referencing. Install the ERIR "
        "working copy first: pip install -e '.[dev]'"
    ) from exc


CONTRACT_VERSION = "1.0"
SCHEMA_BY_RECORD_TYPE = {
    "regulatory_source": "regulatory-source.schema.json",
    "obligation": "obligation.schema.json",
    "applicability_assessment": "applicability-assessment.schema.json",
    "control": "control.schema.json",
    "evidence": "evidence.schema.json",
    "subject_profile": "subject-profile.schema.json",
    "applicability_rule": "applicability-rule.schema.json",
}
ALLOWED_DRAFT_TYPES = {"subject_profile", "control", "evidence", "applicability_assessment"}
ID_PATTERN = re.compile(r"^[A-Z][A-Z0-9_-]{2,63}$")


def allowed_browser_origins(port: int) -> set[str]:
    return {f"http://127.0.0.1:{port}", f"http://localhost:{port}"}


def now() -> str:
    return datetime.now(UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")


class ErirStore:
    def __init__(self, erir_root: Path, data_root: Path):
        self.erir_root = erir_root.resolve()
        self.data_root = data_root.resolve()
        self.draft_root = self.data_root / "draft-packages"
        self.audit_path = self.data_root / "audit-events.jsonl"
        self.draft_root.mkdir(parents=True, exist_ok=True)
        self.data_root.mkdir(parents=True, exist_ok=True)
        self.schemas = self._load_schemas()
        self.registry = Registry().with_resources(
            (schema.get("$id", name), Resource.from_contents(schema))
            for name, schema in self.schemas.items()
        )

    def _load_schemas(self) -> dict[str, dict]:
        schema_root = self.erir_root / "schemas"
        if not schema_root.is_dir():
            raise ValueError(f"ERIR schemas directory was not found: {schema_root}")
        return {
            path.name: json.loads(path.read_text(encoding="utf-8"))
            for path in schema_root.glob("*.schema.json")
        }

    def validate(self, record: dict) -> list[str]:
        record_type = record.get("record_type")
        schema_name = SCHEMA_BY_RECORD_TYPE.get(record_type)
        if not schema_name:
            return [f"Unknown or missing ERIR record_type: {record_type!r}"]
        if schema_name not in self.schemas:
            return [f"ERIR schema is unavailable: {schema_name}"]
        validator = Draft202012Validator(
            self.schemas[schema_name], registry=self.registry, format_checker=FormatChecker()
        )
        return [
            f"{'.'.join(str(item) for item in error.path) or '<root>'}: {error.message}"
            for error in sorted(validator.iter_errors(record), key=lambda item: list(item.path))
        ]

    def records(self) -> dict[str, dict]:
        roots = [self.erir_root / "catalog" / "sources", self.erir_root / "examples" / "valid"]
        found: dict[str, dict] = {}
        for root in roots:
            if not root.is_dir():
                continue
            for path in root.rglob("*.json"):
                try:
                    record = json.loads(path.read_text(encoding="utf-8"))
                except (OSError, json.JSONDecodeError):
                    continue
                if isinstance(record, dict) and isinstance(record.get("id"), str):
                    record["_erir_path"] = str(path.relative_to(self.erir_root)).replace("\\", "/")
                    found.setdefault(record["id"], record)
        return found

    def trace(self, requested_ids: list[str]) -> dict:
        all_records = self.records()
        selected = {record_id: all_records[record_id] for record_id in requested_ids if record_id in all_records}
        related: set[str] = set()
        for record in selected.values():
            if record.get("record_type") == "obligation":
                related.add(record.get("source_id", ""))
            if record.get("record_type") == "applicability_assessment":
                related.add(record.get("obligation_id", ""))
            if record.get("record_type") == "control":
                related.update(record.get("obligation_ids", []))
            if record.get("record_type") == "evidence":
                related.add(record.get("control_id", ""))
        for candidate_id, record in all_records.items():
            if record.get("source_id") in selected or record.get("obligation_id") in selected:
                related.add(candidate_id)
            if any(candidate_id in item.get("obligation_ids", []) for item in selected.values()):
                related.add(candidate_id)
            if record.get("control_id") in selected:
                related.add(candidate_id)
        for record_id in related:
            if record_id in all_records:
                selected.setdefault(record_id, all_records[record_id])
        return {"contract_version": CONTRACT_VERSION, "records": list(selected.values()), "missing_ids": [i for i in requested_ids if i not in all_records]}

    def save_drafts(self, payload: dict, client: str) -> dict:
        if payload.get("intent") != "create_draft_records":
            raise ValueError("Explicit intent 'create_draft_records' is required.")
        records = payload.get("records")
        if not isinstance(records, list) or not records:
            raise ValueError("At least one draft record is required.")
        problems: list[dict] = []
        for index, record in enumerate(records):
            if not isinstance(record, dict):
                problems.append({"index": index, "errors": ["Record must be a JSON object."]})
                continue
            if record.get("record_type") not in ALLOWED_DRAFT_TYPES:
                problems.append({"index": index, "errors": ["Only subject profile, control, evidence, and applicability-assessment drafts are accepted."]})
                continue
            if not ID_PATTERN.fullmatch(str(record.get("id", ""))):
                problems.append({"index": index, "errors": ["ERIR identifier is missing or invalid."]})
                continue
            errors = self.validate(record)
            if errors:
                problems.append({"index": index, "id": record.get("id"), "errors": errors})
        if problems:
            return {"accepted": False, "validation_errors": problems}

        package_id = f"PKG-{uuid.uuid4().hex[:12].upper()}"
        stored = {
            "package_type": "erir_ea_draft_handoff",
            "contract_version": CONTRACT_VERSION,
            "package_id": package_id,
            "submitted_at": now(),
            "review_status": "draft",
            "provenance": payload.get("provenance", {}),
            "records": records,
        }
        encoded = json.dumps(stored, sort_keys=True, separators=(",", ":")).encode("utf-8")
        stored["content_sha256"] = hashlib.sha256(encoded).hexdigest()
        target = self.draft_root / f"{package_id}.json"
        target.write_text(json.dumps(stored, indent=2) + "\n", encoding="utf-8")
        event = {
            "event_type": "erir.ea.draft_package.accepted",
            "event_id": str(uuid.uuid4()),
            "occurred_at": now(),
            "package_id": package_id,
            "record_ids": [record["id"] for record in records],
            "review_status": "draft",
            "client": client,
            "content_sha256": stored["content_sha256"],
        }
        with self.audit_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(event, sort_keys=True) + "\n")
        return {"accepted": True, "package_id": package_id, "review_status": "draft", "content_sha256": stored["content_sha256"], "record_ids": event["record_ids"]}


class Handler(BaseHTTPRequestHandler):
    store: ErirStore

    def log_message(self, format: str, *args: object) -> None:
        print("[gateway] " + (format % args))

    def _approved_browser_origin(self) -> str | None:
        origin = self.headers.get("Origin")
        return origin if origin in allowed_browser_origins(self.server.server_port) else None

    def _json(self, payload: dict, status: HTTPStatus = HTTPStatus.OK) -> None:
        body = json.dumps(payload, indent=2).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        origin = self._approved_browser_origin()
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:
        if not self._approved_browser_origin():
            return self._json({"ok": False, "error": "Browser origin is not permitted."}, HTTPStatus.FORBIDDEN)
        self._json({"ok": True})

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/v1/health":
            return self._json({"ok": True, "contract_version": CONTRACT_VERSION, "mode": "local_only_read_and_draft_boundary", "erir_root": str(self.store.erir_root)})
        if parsed.path == "/api/v1/trace":
            ids = [item for item in parse_qs(parsed.query).get("ids", [""])[0].split(",") if item]
            return self._json(self.store.trace(ids))
        self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        if urlparse(self.path).path != "/api/v1/draft-packages":
            return self._json({"error": "Not found"}, HTTPStatus.NOT_FOUND)
        if not self._approved_browser_origin():
            return self._json({"accepted": False, "error": "Draft submission requires an approved local browser origin."}, HTTPStatus.FORBIDDEN)
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > 1_000_000:
                raise ValueError("Request body must be between 1 and 1,000,000 bytes.")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Request must be a JSON object.")
            result = self.store.save_drafts(payload, self.client_address[0])
            return self._json(result, HTTPStatus.ACCEPTED if result.get("accepted") else HTTPStatus.UNPROCESSABLE_ENTITY)
        except (ValueError, json.JSONDecodeError) as exc:
            return self._json({"accepted": False, "error": str(exc)}, HTTPStatus.BAD_REQUEST)


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the local ROI-EA / ERIR gateway.")
    parser.add_argument("--erir-root", default=os.environ.get("ERIR_REPOSITORY_PATH"), help="Path to an ERIR working copy (or set ERIR_REPOSITORY_PATH).")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--data-root", default="gateway-data", help="Local directory for submitted draft packages and audit events.")
    args = parser.parse_args()
    if not args.erir_root:
        parser.error("--erir-root or ERIR_REPOSITORY_PATH is required")
    Handler.store = ErirStore(Path(args.erir_root), Path(args.data_root))
    server = ThreadingHTTPServer(("127.0.0.1", args.port), Handler)
    print(f"ERIR gateway listening on http://127.0.0.1:{args.port} (localhost only)")
    server.serve_forever()


if __name__ == "__main__":
    main()
