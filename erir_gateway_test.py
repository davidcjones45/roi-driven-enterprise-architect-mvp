import sys
import types
import unittest

jsonschema = types.ModuleType("jsonschema")
jsonschema.Draft202012Validator = object
jsonschema.FormatChecker = object
referencing = types.ModuleType("referencing")
referencing.Registry = object
referencing.Resource = object
sys.modules.setdefault("jsonschema", jsonschema)
sys.modules.setdefault("referencing", referencing)

from erir_gateway import allowed_browser_origins


class GatewayOriginPolicyTest(unittest.TestCase):
    def test_only_expected_local_web_origins_are_allowed(self):
        origins = allowed_browser_origins(8766)
        self.assertEqual(
            origins,
            {"http://127.0.0.1:8766", "http://localhost:8766"},
        )
        self.assertNotIn("null", origins)
        self.assertNotIn("file://", origins)
        self.assertEqual(allowed_browser_origins(9000), {"http://127.0.0.1:9000", "http://localhost:9000"})


if __name__ == "__main__":
    unittest.main()
