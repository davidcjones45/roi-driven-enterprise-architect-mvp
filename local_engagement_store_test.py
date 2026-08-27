import tempfile
import unittest
from pathlib import Path
from local_engagement_store import EngagementStore, ValidationError, sha256

PAYLOAD = {"client_name":"North Star","initiative_name":"Diagnostic","engagement_title":"North Star diagnostic","executive_sponsor":"Sponsor","business_owner":"Owner","consultant":"Consultant","decision_question":"What should happen?","scope":"Decision scoped","out_of_scope":"No implementation","start_date":"2026-08-26","target_decision_date":"2026-09-30","industry":"Banking","jurisdictions":"United States","status":"Discovery"}

class EngagementStoreTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.store = EngagementStore(Path(self.temp.name))
    def tearDown(self): self.temp.cleanup()
    def test_create_survives_restart_and_lists_recent(self):
        record = self.store.create(PAYLOAD)
        restarted = EngagementStore(Path(self.temp.name))
        self.assertEqual(restarted.get(record['engagement_id'])['client_name'], 'North Star')
        self.assertEqual(len(restarted.list()), 1)
    def test_missing_required_field_is_rejected(self):
        with self.assertRaises(ValidationError): self.store.create({**PAYLOAD, 'scope': ''})
    def test_duplicate_is_new_draft_and_archive_is_not_delete(self):
        record = self.store.create(PAYLOAD)
        duplicate = self.store.duplicate(record['engagement_id'])
        archived = self.store.archive(record['engagement_id'])
        self.assertNotEqual(record['engagement_id'], duplicate['engagement_id'])
        self.assertEqual(duplicate['status'], 'Draft')
        self.assertEqual(archived['status'], 'Archived')
        self.assertEqual(len(self.store.list()), 2)
    def test_discovery_is_persisted_and_requires_explicit_source_for_entered_statement(self):
        record = self.store.create(PAYLOAD)
        discovery = {"business_problem": {"problem_statement": {"value": "Manual review delays service.", "state": "Client assertion", "source": "Discovery interview 2026-08-26"}}}
        updated = self.store.update_discovery(record['engagement_id'], discovery)
        self.assertEqual(updated['discovery']['business_problem']['problem_statement']['state'], 'Client assertion')
        with self.assertRaises(ValidationError):
            self.store.update_discovery(record['engagement_id'], {"business_problem": {"problem_statement": {"value": "Unsupported", "state": "Verified fact", "source": ""}}})
    def test_evidence_register_is_append_only_and_supply_is_not_review(self):
        record = self.store.create(PAYLOAD)
        first = self.store.add_evidence(record['engagement_id'], {"title":"Workflow note","evidence_type":"Process document","classification":"Unknown","review_state":"Supplied","source_reference":"Client file list","relevance":"Current workflow context"})
        second = self.store.add_evidence(record['engagement_id'], {"title":"Control note","evidence_type":"Control evidence","classification":"Client assertion","review_state":"Qualified review required","source_reference":"Interview","relevance":"Control context"})
        records = self.store.list_evidence(record['engagement_id'])
        self.assertEqual([item['evidence_id'] for item in records], [first['evidence_id'], second['evidence_id']])
        self.assertEqual(records[0]['review_state'], 'Supplied')
        with self.assertRaises(ValidationError):
            self.store.add_evidence(record['engagement_id'], {"title":"Unreviewed fact","evidence_type":"Other","classification":"Verified fact","review_state":"Not reviewed","source_reference":"Unattributed","relevance":"Test"})

    def test_ai_necessity_requires_a_viable_baseline_and_is_persisted_as_review_input(self):
        record = self.store.create(PAYLOAD)
        ai_necessity = {"assessed_task":"Flag incomplete intake packets","non_ai_baseline":"Coordinator checks the intake queue","non_ai_viable":"Yes","proposed_bounded_support":"Flag missing required metadata for review","excluded_consequential_actions":"No approval, denial, eligibility, pricing, notice, or system write","accountable_disposition_owner":"Operations manager","assumptions_and_unknowns":"False-positive rate requires later measurement"}
        updated = self.store.update_ai_necessity(record['engagement_id'], ai_necessity)
        self.assertEqual(updated['ai_necessity']['non_ai_viable'], 'Yes')
        self.assertEqual(self.store.get(record['engagement_id'])['ai_necessity']['accountable_disposition_owner'], 'Operations manager')
        with self.assertRaises(ValidationError):
            self.store.update_ai_necessity(record['engagement_id'], {**ai_necessity, 'non_ai_viable': 'Maybe'})

    def test_findings_and_questions_are_append_only_qualified_review_inputs(self):
        record = self.store.create(PAYLOAD)
        finding = self.store.add_finding(record['engagement_id'], {"title":"Owner is not yet identified","domain":"Governance","finding_statement":"The supplied process description does not identify an accountable owner.","severity":"High","status":"Open","supporting_evidence":"Discovery interview 2026-08-26","contradictory_evidence":"No contrary evidence supplied","decision_impact":"Decision-blocking","owner":"Executive sponsor","required_action":"Obtain accountable ownership evidence"})
        question = self.store.add_open_question(record['engagement_id'], {"question":"Who can accept the bounded operating commitment?","domain":"Authority","owner":"Business owner","evidence_needed":"Applicable authority record and acceptance evidence","decision_impact":"Material","status":"Open"})
        registers = self.store.findings_and_questions(record['engagement_id'])
        self.assertEqual((finding['findings_register'][0]['finding_id'].startswith('FND-'), question['open_questions_register'][0]['question_id'].startswith('QST-')), (True, True))
        self.assertEqual((len(registers['findings']), len(registers['questions'])), (1, 1))
        self.assertEqual(self.store.get(record['engagement_id'])['finding_count'], 1)
        with self.assertRaises(ValidationError):
            self.store.add_finding(record['engagement_id'], {"title":"Unsupported","domain":"Evidence","finding_statement":"A statement without traceable support.","severity":"Low","status":"Open","supporting_evidence":"","decision_impact":"Informational","owner":"Reviewer","required_action":"Supply support"})

    def test_recommendation_is_consultant_entered_and_versioned(self):
        record = self.store.create(PAYLOAD)
        recommendation = {"recommendation":"DEFER","executive_summary":"Evidence is not sufficient for a recommendation to proceed.","rationale":"Accountable authority is not identified.","decision_date":"2026-08-26","consultant":"Consultant","key_evidence":"EVD-001","key_findings":"FND-001","conditions":"Obtain authority and acceptance evidence before reconsideration.","assumptions":"None resolved.","residual_risks":"Unresolved authority boundary.","required_next_steps":"Obtain the accountable record.","review_trigger":"Authority record is supplied."}
        first = self.store.record_recommendation(record['engagement_id'], recommendation)
        second = self.store.record_recommendation(record['engagement_id'], {**recommendation, 'recommendation': 'REDESIGN', 'conditions': 'Redesign the boundary and then reassess.'})
        self.assertEqual((first['recommendation']['version'], second['recommendation']['version'], len(second['recommendation_history'])), (1, 2, 2))
        with self.assertRaises(ValidationError):
            self.store.record_recommendation(record['engagement_id'], {**recommendation, 'recommendation': 'AUTOMATIC APPROVAL'})

    def test_snapshot_is_immutable_and_preserves_recommendation_time_content_with_hash_manifest(self):
        record = self.store.create(PAYLOAD)
        recommendation = {"recommendation":"DEFER","executive_summary":"Evidence is not sufficient.","rationale":"Authority is not identified.","decision_date":"2026-08-26","consultant":"Consultant","key_evidence":"EVD-001","key_findings":"FND-001","conditions":"Obtain authority evidence.","required_next_steps":"Obtain accountable record.","review_trigger":"Authority record is supplied."}
        report = {"title":"Executive package","sections":{"economics":{"baseline":"Not supplied"},"architecture":{"alternatives":"Not supplied"},"governance":{"authority":"Not supplied"},"evidence":{"regulatory_references":["REG-001"]}}}
        result = self.store.record_recommendation_and_snapshot(record['engagement_id'], recommendation, report)
        snapshot = result['snapshot']
        self.assertEqual(snapshot['content']['recommendation']['recommendation'], 'DEFER')
        self.assertEqual(snapshot['manifest']['content_sha256'], sha256(snapshot['content']))
        self.assertEqual(self.store.list_snapshots(record['engagement_id'])[0]['snapshot_id'], snapshot['content']['snapshot_id'])
        self.assertEqual(self.store.get_snapshot(record['engagement_id'], snapshot['content']['snapshot_id'])['manifest']['content_sha256'], snapshot['manifest']['content_sha256'])

if __name__ == '__main__': unittest.main()
