"""Local-only static server for the ROI-EA MVP.

Python's default MIME table on some Windows installations serves .mjs as
text/plain, which browsers reject for ES-module imports. This launcher keeps
the MVP local and supplies the required JavaScript MIME type.
"""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import mimetypes

ROOT = Path(__file__).resolve().parent
PORT = 8766


class RoiEaHandler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        **mimetypes.types_map,
        ".mjs": "text/javascript",
        ".js": "text/javascript",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)


if __name__ == "__main__":
    server = ThreadingHTTPServer(("127.0.0.1", PORT), RoiEaHandler)
    print(f"ROI-EA is serving at http://127.0.0.1:{PORT}/index.html")
    server.serve_forever()
