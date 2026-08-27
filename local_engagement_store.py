"""Local-only SQLite persistence for the FEDARM consulting engagement layer."""
from __future__ import annotations

import json
import sqlite3
import hashlib
from contextlib import closing
import uuid
from datetime import datetime, timezone
from pathlib import Path

STATUSES = {"Draft", "Discovery", "Analysis", "Decision Preparation", "Decision Issued", "Closed", "Archived"}
DISCOVERY_STATES = {"Verified fact", "Client assertion", "Consultant inference", "Assumption", "Estimate", "Unknown"}
EVIDENCE_TYPES = {"Interview note", "Process document", "Policy or procedure", "System or architecture document", "Cost or performance data", "Contract or vendor material", "Control evidence", "Regulatory reference", "Other"}
EVIDENCE_REVIEW_STATES = {"Not reviewed", "Supplied", "Qualified review required", "Reviewed with limitation", "Superseded"}
AI_NECESSITY_STATES = {"Unknown", "Yes", "No", "Not applicable"}
FINDING_DOMAINS = {"Business", "Economics", "Architecture", "Data", "AI", "Governance", "Authority", "Regulatory", "Security", "Operations", "Vendor", "Evidence", "Other"}
FINDING_SEVERITIES = {"Observation", "Low", "Moderate", "High", "Decision-critical"}
FINDING_STATUSES = {"Open", "In review", "Resolved", "Deferred"}
QUESTION_STATUSES = {"Open", "In review", "Resolved", "Unable to resolve", "Deferred"}
DECISION_IMPACTS = {"Informational", "Material", "Decision-blocking"}
RECOMMENDATION_OPTIONS = {"AUTHORIZE", "REDESIGN", "DEFER", "DECLINE"}
REQUIRED_FIELDS = {
    "client_name", "initiative_name", "engagement_title", "executive_sponsor", "business_owner",
    "consultant", "decision_question", "scope", "out_of_scope", "start_date", "target_decision_date",
    "industry", "jurisdictions",
}


class ValidationError(ValueError):
    pass


def now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def canonical_json(value: object) -> str:
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def sha256(value: object) -> str:
    return hashlib.sha256(canonical_json(value).encode("utf-8")).hexdigest()


def validate(payload: dict) -> None:
    missing = sorted(field for field in REQUIRED_FIELDS if not str(payload.get(field, "")).strip())
    if missing:
        raise ValidationError("Missing required fields: " + ", ".join(missing))
    if payload.get("status", "Draft") not in STATUSES:
        raise ValidationError("Unrecognized engagement status.")


def validate_discovery(discovery: dict) -> None:
    if not isinstance(discovery, dict):
        raise ValidationError("Discovery must be a structured object.")
    for section, fields in discovery.items():
        if not isinstance(fields, dict):
            raise ValidationError(f"Discovery section {section} must be a structured object.")
        for field, statement in fields.items():
            if not isinstance(statement, dict):
                raise ValidationError(f"Discovery statement {section}.{field} must be structured.")
            if statement.get("state", "Unknown") not in DISCOVERY_STATES:
                raise ValidationError(f"Discovery statement {section}.{field} has an unrecognized state.")
            if str(statement.get("value", "")).strip() and not str(statement.get("source", "")).strip():
                raise ValidationError(f"Discovery statement {section}.{field} needs a source or reviewer reference.")


def validate_evidence_record(record: dict) -> None:
    required = {"title", "evidence_type", "source_reference", "relevance"}
    missing = sorted(field for field in required if not str(record.get(field, "")).strip())
    if missing:
        raise ValidationError("Evidence record missing required fields: " + ", ".join(missing))
    if record.get("evidence_type") not in EVIDENCE_TYPES:
        raise ValidationError("Evidence record has an unrecognized type.")
    if record.get("classification", "Unknown") not in DISCOVERY_STATES:
        raise ValidationError("Evidence record has an unrecognized classification.")
    if record.get("review_state", "Not reviewed") not in EVIDENCE_REVIEW_STATES:
        raise ValidationError("Evidence record has an unrecognized review state.")
    if record.get("review_state") == "Reviewed with limitation" and not str(record.get("limitation_or_gap", "")).strip():
        raise ValidationError("A reviewed record with limitation needs its limitation or gap stated.")
    if record.get("classification") == "Verified fact" and not str(record.get("reviewer", "")).strip():
        raise ValidationError("A verified fact needs a named reviewer or accountable source.")


def validate_ai_necessity(record: dict) -> None:
    if not isinstance(record, dict):
        raise ValidationError("AI Necessity Gate must be a structured object.")
    if record.get("non_ai_viable", "Unknown") not in AI_NECESSITY_STATES:
        raise ValidationError("AI Necessity Gate has an unrecognized non-AI viability state.")


def validate_finding(record: dict) -> None:
    required = {"title", "finding_statement", "supporting_evidence", "owner", "required_action"}
    missing = sorted(field for field in required if not str(record.get(field, "")).strip())
    if missing:
        raise ValidationError("Finding missing required fields: " + ", ".join(missing))
    if record.get("domain", "Other") not in FINDING_DOMAINS or record.get("severity", "Observation") not in FINDING_SEVERITIES:
        raise ValidationError("Finding has an unrecognized domain or severity.")
    if record.get("status", "Open") not in FINDING_STATUSES or record.get("decision_impact", "Informational") not in DECISION_IMPACTS:
        raise ValidationError("Finding has an unrecognized status or decision impact.")
    if record.get("status") == "Resolved" and not str(record.get("resolution", "")).strip():
        raise ValidationError("A resolved finding needs its resolution recorded.")


def validate_open_question(record: dict) -> None:
    required = {"question", "owner", "evidence_needed"}
    missing = sorted(field for field in required if not str(record.get(field, "")).strip())
    if missing:
        raise ValidationError("Open question missing required fields: " + ", ".join(missing))
    if record.get("domain", "Other") not in FINDING_DOMAINS or record.get("decision_impact", "Informational") not in DECISION_IMPACTS:
        raise ValidationError("Open question has an unrecognized domain or decision impact.")
    if record.get("status", "Open") not in QUESTION_STATUSES:
        raise ValidationError("Open question has an unrecognized status.")
    if record.get("status") in {"Resolved", "Unable to resolve"} and not str(record.get("resolution", "")).strip():
        raise ValidationError("A closed question state needs its resolution recorded.")


def validate_recommendation(record: dict) -> None:
    required = {"recommendation", "executive_summary", "rationale", "decision_date", "consultant", "key_evidence", "key_findings", "required_next_steps", "review_trigger"}
    missing = sorted(field for field in required if not str(record.get(field, "")).strip())
    if missing:
        raise ValidationError("Recommendation missing required fields: " + ", ".join(missing))
    if record.get("recommendation") not in RECOMMENDATION_OPTIONS:
        raise ValidationError("Recommendation must be AUTHORIZE, REDESIGN, DEFER, or DECLINE.")
    if not str(record.get("conditions", "")).strip():
        raise ValidationError("Recommendation conditions or reconsideration criteria must be explicit.")


class EngagementStore:
    def __init__(self, directory: Path):
        directory.mkdir(parents=True, exist_ok=True)
        self.path = directory / "roi-ea-engagements.sqlite3"
        with closing(self.connection()) as connection:
            connection.execute("""CREATE TABLE IF NOT EXISTS engagements (
              engagement_id TEXT PRIMARY KEY, client_name TEXT NOT NULL, initiative_name TEXT NOT NULL,
              engagement_title TEXT NOT NULL, status TEXT NOT NULL, target_decision_date TEXT NOT NULL,
              created_at TEXT NOT NULL, updated_at TEXT NOT NULL, archived_at TEXT, payload TEXT NOT NULL
            )""")
            connection.execute("""CREATE TABLE IF NOT EXISTS engagement_snapshots (
              snapshot_id TEXT PRIMARY KEY, engagement_id TEXT NOT NULL, created_at TEXT NOT NULL,
              recommendation_id TEXT NOT NULL, content_sha256 TEXT NOT NULL, payload TEXT NOT NULL
            )""")
            connection.commit()

    def connection(self):
        connection = sqlite3.connect(self.path)
        connection.row_factory = sqlite3.Row
        return connection

    def _row(self, row: sqlite3.Row) -> dict:
        record = json.loads(row["payload"])
        record.update({key: row[key] for key in ("engagement_id", "created_at", "updated_at", "archived_at")})
        return record

    def create(self, payload: dict) -> dict:
        payload = dict(payload)
        payload.setdefault("status", "Draft")
        validate(payload)
        record_id, timestamp = str(uuid.uuid4()), now()
        with closing(self.connection()) as connection:
            connection.execute("INSERT INTO engagements VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, ?)", (
                record_id, payload["client_name"], payload["initiative_name"], payload["engagement_title"],
                payload["status"], payload["target_decision_date"], timestamp, timestamp,
                json.dumps(payload, sort_keys=True),
            ))
            connection.commit()
        return self.get(record_id)

    def list(self) -> list[dict]:
        with closing(self.connection()) as connection:
            rows = connection.execute("SELECT * FROM engagements ORDER BY updated_at DESC").fetchall()
        return [self._row(row) for row in rows]

    def get(self, engagement_id: str) -> dict | None:
        with closing(self.connection()) as connection:
            row = connection.execute("SELECT * FROM engagements WHERE engagement_id = ?", (engagement_id,)).fetchone()
        return self._row(row) if row else None

    def update(self, engagement_id: str, payload: dict) -> dict | None:
        current = self.get(engagement_id)
        if not current:
            return None
        record = {**current, **dict(payload), "engagement_id": engagement_id}
        validate(record)
        timestamp = now()
        with closing(self.connection()) as connection:
            connection.execute("UPDATE engagements SET client_name=?, initiative_name=?, engagement_title=?, status=?, target_decision_date=?, updated_at=?, payload=? WHERE engagement_id=?", (
                record["client_name"], record["initiative_name"], record["engagement_title"], record["status"],
                record["target_decision_date"], timestamp, json.dumps({key: value for key, value in record.items() if key not in {"engagement_id", "created_at", "updated_at", "archived_at"}}, sort_keys=True), engagement_id,
            ))
            connection.commit()
        return self.get(engagement_id)

    def archive(self, engagement_id: str) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        record["status"], record["archived_at"] = "Archived", now()
        updated = self.update(engagement_id, record)
        with closing(self.connection()) as connection:
            connection.execute("UPDATE engagements SET archived_at=? WHERE engagement_id=?", (record["archived_at"], engagement_id))
            connection.commit()
        return self.get(engagement_id) if updated else None

    def update_discovery(self, engagement_id: str, discovery: dict) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        validate_discovery(discovery)
        return self.update(engagement_id, {"discovery": discovery})

    def list_evidence(self, engagement_id: str) -> list[dict] | None:
        record = self.get(engagement_id)
        return list(record.get("evidence_register", [])) if record else None

    def add_evidence(self, engagement_id: str, evidence: dict) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        evidence = dict(evidence)
        validate_evidence_record(evidence)
        evidence["evidence_id"] = f"EVD-{uuid.uuid4()}"
        evidence["recorded_at"] = now()
        evidence_register = [*record.get("evidence_register", []), evidence]
        self.update(engagement_id, {"evidence_register": evidence_register})
        return evidence

    def update_ai_necessity(self, engagement_id: str, ai_necessity: dict) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        validate_ai_necessity(ai_necessity)
        return self.update(engagement_id, {"ai_necessity": ai_necessity})

    def findings_and_questions(self, engagement_id: str) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        return {"engagement_id": engagement_id, "findings": list(record.get("findings_register", [])), "questions": list(record.get("open_questions_register", []))}

    def add_finding(self, engagement_id: str, finding: dict) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        finding = dict(finding)
        validate_finding(finding)
        finding["finding_id"] = f"FND-{uuid.uuid4()}"
        finding["recorded_at"] = now()
        findings = [*record.get("findings_register", []), finding]
        return self.update(engagement_id, {"findings_register": findings, "finding_count": len(findings)})

    def add_open_question(self, engagement_id: str, question: dict) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        question = dict(question)
        validate_open_question(question)
        question["question_id"] = f"QST-{uuid.uuid4()}"
        question["recorded_at"] = now()
        questions = [*record.get("open_questions_register", []), question]
        return self.update(engagement_id, {"open_questions_register": questions, "open_question_count": len(questions)})

    def record_recommendation(self, engagement_id: str, recommendation: dict) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        recommendation = dict(recommendation)
        validate_recommendation(recommendation)
        history = list(record.get("recommendation_history", []))
        recommendation["recommendation_id"] = f"REC-{uuid.uuid4()}"
        recommendation["version"] = len(history) + 1
        recommendation["recorded_at"] = now()
        history.append(recommendation)
        return self.update(engagement_id, {"recommendation": recommendation, "recommendation_history": history, "recommendation_count": len(history)})

    def list_snapshots(self, engagement_id: str) -> list[dict] | None:
        if not self.get(engagement_id):
            return None
        with closing(self.connection()) as connection:
            rows = connection.execute("SELECT snapshot_id, created_at, recommendation_id, content_sha256 FROM engagement_snapshots WHERE engagement_id=? ORDER BY created_at DESC", (engagement_id,)).fetchall()
        return [dict(row) for row in rows]

    def get_snapshot(self, engagement_id: str, snapshot_id: str) -> dict | None:
        with closing(self.connection()) as connection:
            row = connection.execute("SELECT payload FROM engagement_snapshots WHERE engagement_id=? AND snapshot_id=?", (engagement_id, snapshot_id)).fetchone()
        return json.loads(row["payload"]) if row else None

    def _build_snapshot(self, record: dict, generated_report: dict, application_version: str = "roi-ea-local-consulting-v0.1", methodology_version: str = "FEDARM-v0.1", timestamp: str | None = None) -> dict:
        recommendation = record.get("recommendation")
        if not isinstance(recommendation, dict) or not recommendation.get("recommendation_id"):
            raise ValidationError("A recorded consultant recommendation is required before a snapshot can be issued.")
        if not isinstance(generated_report, dict) or not generated_report:
            raise ValidationError("A generated executive package is required for an engagement snapshot.")
        snapshot_id, timestamp = f"SNP-{uuid.uuid4()}", timestamp or now()
        evidence = list(record.get("evidence_register", []))
        content = {
            "engagement_id": record["engagement_id"],
            "snapshot_id": snapshot_id,
            "timestamp": timestamp,
            "application_version": application_version,
            "methodology_version": methodology_version,
            "evidence_inventory": evidence,
            "evidence_hashes": {item.get("evidence_id", f"index-{index}"): sha256(item) for index, item in enumerate(evidence)},
            "discovery_state": record.get("discovery", {}),
            "economic_inputs": generated_report.get("sections", {}).get("economics", {}),
            "architecture_options": generated_report.get("sections", {}).get("architecture", {}),
            "authority_state": generated_report.get("sections", {}).get("governance", {}),
            "regulatory_references": generated_report.get("sections", {}).get("evidence", {}).get("regulatory_references", []),
            "findings": list(record.get("findings_register", [])),
            "open_questions": list(record.get("open_questions_register", [])),
            "ai_necessity_gate": record.get("ai_necessity", {}),
            "recommendation": recommendation,
            "generated_report": generated_report,
        }
        content_hash = sha256(content)
        return {"schema": "roi-ea-engagement-snapshot-v0.1", "content": content, "manifest": {"algorithm": "SHA-256", "content_sha256": content_hash, "evidence_hashes": content["evidence_hashes"]}}

    def issue_snapshot(self, engagement_id: str, generated_report: dict, application_version: str = "roi-ea-local-consulting-v0.1", methodology_version: str = "FEDARM-v0.1") -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        snapshot = self._build_snapshot(record, generated_report, application_version, methodology_version)
        content, manifest = snapshot["content"], snapshot["manifest"]
        with closing(self.connection()) as connection:
            connection.execute("INSERT INTO engagement_snapshots VALUES (?, ?, ?, ?, ?, ?)", (content["snapshot_id"], engagement_id, content["timestamp"], content["recommendation"]["recommendation_id"], manifest["content_sha256"], canonical_json(snapshot)))
            connection.commit()
        return snapshot

    def record_recommendation_and_snapshot(self, engagement_id: str, recommendation: dict, generated_report: dict) -> dict | None:
        current = self.get(engagement_id)
        if not current:
            return None
        recommendation = dict(recommendation)
        validate_recommendation(recommendation)
        history = list(current.get("recommendation_history", []))
        timestamp = now()
        recommendation.update({"recommendation_id": f"REC-{uuid.uuid4()}", "version": len(history) + 1, "recorded_at": timestamp})
        record = {**current, "recommendation": recommendation, "recommendation_history": [*history, recommendation], "recommendation_count": len(history) + 1}
        snapshot = self._build_snapshot(record, generated_report, timestamp=timestamp)
        payload = {key: value for key, value in record.items() if key not in {"engagement_id", "created_at", "updated_at", "archived_at"}}
        content, manifest = snapshot["content"], snapshot["manifest"]
        with closing(self.connection()) as connection:
            connection.execute("UPDATE engagements SET client_name=?, initiative_name=?, engagement_title=?, status=?, target_decision_date=?, updated_at=?, payload=? WHERE engagement_id=?", (
                record["client_name"], record["initiative_name"], record["engagement_title"], record["status"], record["target_decision_date"], timestamp, canonical_json(payload), engagement_id,
            ))
            connection.execute("INSERT INTO engagement_snapshots VALUES (?, ?, ?, ?, ?, ?)", (content["snapshot_id"], engagement_id, timestamp, recommendation["recommendation_id"], manifest["content_sha256"], canonical_json(snapshot)))
            connection.commit()
        return {"engagement": self.get(engagement_id), "snapshot": snapshot}

    def duplicate(self, engagement_id: str) -> dict | None:
        record = self.get(engagement_id)
        if not record:
            return None
        for key in ("engagement_id", "created_at", "updated_at", "archived_at"):
            record.pop(key, None)
        record["engagement_title"] = f"{record['engagement_title']} (copy)"
        record["status"] = "Draft"
        return self.create(record)
