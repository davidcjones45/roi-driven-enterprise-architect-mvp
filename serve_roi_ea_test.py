import json
import importlib.util
import tempfile
import threading
import unittest
from http.server import ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from local_engagement_store import EngagementStore

_spec = importlib.util.spec_from_file_location("serve_roi_ea", Path(__file__).with_name("serve-roi-ea.py"))
serve_roi_ea = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(serve_roi_ea)

PAYLOAD = {"client_name":"North Star","initiative_name":"Diagnostic","engagement_title":"North Star diagnostic","executive_sponsor":"Sponsor","business_owner":"Owner","consultant":"Consultant","decision_question":"What should happen?","scope":"Decision scoped","out_of_scope":"No implementation","start_date":"2026-08-26","target_decision_date":"2026-09-30","industry":"Banking","jurisdictions":"United States","status":"Discovery"}

class LocalApiTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        serve_roi_ea.STORE = EngagementStore(Path(self.temp.name))
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), serve_roi_ea.RoiEaHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"
    def tearDown(self):
        self.server.shutdown(); self.server.server_close(); self.thread.join()
        self.temp.cleanup()
    def request(self, path, method="GET", body=None):
        request = Request(self.base + path, method=method, data=body, headers={"Content-Type":"application/json"})
        with urlopen(request) as response:
            return response.status, json.loads(response.read())
    def test_local_contract_creates_exports_imports_and_refuses_delete(self):
        status, health = self.request("/api/local/health")
        self.assertEqual((status, health["mode"]), (200, "local_consulting"))
        status, created = self.request("/api/engagements", "POST", json.dumps(PAYLOAD).encode())
        self.assertEqual((status, created["status"]), (201, "Discovery"))
        discovery = {"business_problem": {"problem_statement": {"value": "Manual review delays service.", "state": "Client assertion", "source": "Discovery interview"}}}
        status, updated = self.request(f"/api/engagements/{created['engagement_id']}/discovery", "POST", json.dumps(discovery).encode())
        self.assertEqual((status, updated["discovery"]["business_problem"]["problem_statement"]["state"]), (200, "Client assertion"))
        status, retrieved = self.request(f"/api/engagements/{created['engagement_id']}/discovery")
        self.assertEqual((status, retrieved["discovery"]["business_problem"]["problem_statement"]["source"]), (200, "Discovery interview"))
        evidence = {"title":"Workflow note","evidence_type":"Process document","classification":"Unknown","review_state":"Supplied","source_reference":"Client file list","relevance":"Current workflow context"}
        status, recorded_evidence = self.request(f"/api/engagements/{created['engagement_id']}/evidence", "POST", json.dumps(evidence).encode())
        self.assertEqual((status, recorded_evidence['review_state']), (201, 'Supplied'))
        status, evidence_register = self.request(f"/api/engagements/{created['engagement_id']}/evidence")
        self.assertEqual((status, len(evidence_register['evidence'])), (200, 1))
        ai_necessity = {"assessed_task":"Flag incomplete intake packets","non_ai_baseline":"Coordinator checks the intake queue","non_ai_viable":"Yes","proposed_bounded_support":"Flag missing required metadata for review","excluded_consequential_actions":"No approval, denial, eligibility, pricing, notice, or system write","accountable_disposition_owner":"Operations manager","assumptions_and_unknowns":"False-positive rate requires later measurement"}
        status, updated_ai_necessity = self.request(f"/api/engagements/{created['engagement_id']}/ai-necessity", "POST", json.dumps(ai_necessity).encode())
        self.assertEqual((status, updated_ai_necessity['ai_necessity']['non_ai_viable']), (200, 'Yes'))
        status, retrieved_ai_necessity = self.request(f"/api/engagements/{created['engagement_id']}/ai-necessity")
        self.assertEqual((status, retrieved_ai_necessity['ai_necessity']['accountable_disposition_owner']), (200, 'Operations manager'))
        finding = {"title":"Owner is not yet identified","domain":"Governance","finding_statement":"The supplied process description does not identify an accountable owner.","severity":"High","status":"Open","supporting_evidence":"Discovery interview","contradictory_evidence":"No contrary evidence supplied","decision_impact":"Decision-blocking","owner":"Executive sponsor","required_action":"Obtain accountable ownership evidence"}
        status, updated_finding = self.request(f"/api/engagements/{created['engagement_id']}/findings", "POST", json.dumps(finding).encode())
        self.assertEqual((status, updated_finding['finding_count']), (201, 1))
        question = {"question":"Who can accept the bounded operating commitment?","domain":"Authority","owner":"Business owner","evidence_needed":"Applicable authority record and acceptance evidence","decision_impact":"Material","status":"Open"}
        status, updated_question = self.request(f"/api/engagements/{created['engagement_id']}/questions", "POST", json.dumps(question).encode())
        self.assertEqual((status, updated_question['open_question_count']), (201, 1))
        status, registers = self.request(f"/api/engagements/{created['engagement_id']}/findings")
        self.assertEqual((status, len(registers['findings']), len(registers['questions'])), (200, 1, 1))
        recommendation = {"recommendation":"DEFER","executive_summary":"Evidence is not sufficient for a recommendation to proceed.","rationale":"Accountable authority is not identified.","decision_date":"2026-08-26","consultant":"Consultant","key_evidence":"EVD-001","key_findings":"FND-001","conditions":"Obtain authority and acceptance evidence before reconsideration.","assumptions":"None resolved.","residual_risks":"Unresolved authority boundary.","required_next_steps":"Obtain the accountable record.","review_trigger":"Authority record is supplied."}
        status, recorded_recommendation = self.request(f"/api/engagements/{created['engagement_id']}/recommendation", "POST", json.dumps(recommendation).encode())
        self.assertEqual((status, recorded_recommendation['recommendation']['recommendation'], recorded_recommendation['recommendation']['version']), (201, 'DEFER', 1))
        status, retrieved_recommendation = self.request(f"/api/engagements/{created['engagement_id']}/recommendation")
        self.assertEqual((status, len(retrieved_recommendation['history'])), (200, 1))
        generated_report = {"title":"Executive package","sections":{"economics":{},"architecture":{},"governance":{},"evidence":{"regulatory_references":[]}}}
        status, issued = self.request(f"/api/engagements/{created['engagement_id']}/recommendation-and-snapshot", "POST", json.dumps({"recommendation": {**recommendation, "recommendation":"REDESIGN", "conditions":"Redesign and reassess."}, "generated_report": generated_report}).encode())
        self.assertEqual((status, issued['snapshot']['schema'], issued['engagement']['recommendation']['version']), (201, 'roi-ea-engagement-snapshot-v0.1', 2))
        snapshot_id = issued['snapshot']['content']['snapshot_id']
        status, snapshots = self.request(f"/api/engagements/{created['engagement_id']}/snapshots")
        self.assertEqual((status, snapshots['snapshots'][0]['snapshot_id']), (200, snapshot_id))
        status, snapshot = self.request(f"/api/engagements/{created['engagement_id']}/snapshots/{snapshot_id}")
        self.assertEqual((status, snapshot['manifest']['content_sha256']), (200, issued['snapshot']['manifest']['content_sha256']))
        status, exported = self.request(f"/api/engagements/{created['engagement_id']}/export")
        self.assertEqual((status, exported["schema"]), (200, "roi-ea-local-engagement-export-v0.1"))
        status, imported = self.request("/api/engagements/import", "POST", json.dumps(exported).encode())
        self.assertEqual((status, imported["status"]), (201, "Discovery"))
        with self.assertRaises(HTTPError) as error:
            self.request("/api/engagements/anything", "DELETE")
        self.assertEqual(error.exception.code, 405)

if __name__ == '__main__': unittest.main()
