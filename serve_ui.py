import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = "7w7web"

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

try:
    with socketserver.TCPServer(("", PORT), Handler) as httpd:
        print(f"Serving at http://localhost:{PORT}")
        httpd.serve_forever()
except OSError as e:
    print(f"Error: {e}")
    print("Try using a different port or check if 8000 is occupied.")
