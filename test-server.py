"""
Simple test webhook server for cronflow.
Run: python3 test-server.py
It listens on http://localhost:4444 and logs every request.
"""

from http.server import HTTPServer, BaseHTTPRequestHandler
import json
import time
import random

class WebhookHandler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length).decode("utf-8") if content_length else ""

        try:
            payload = json.loads(body) if body else {}
        except json.JSONDecodeError:
            payload = {"raw": body}

        job_name = payload.get("jobName", "unknown")
        triggered_by = payload.get("triggeredBy", "unknown")

        print(f"\n{'='*60}")
        print(f"[WEBHOOK HIT] {time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"  Job:         {job_name}")
        print(f"  Triggered:   {triggered_by}")
        print(f"  Header:      x-cronflow-job = {self.headers.get('x-cronflow-job', 'n/a')}")
        print(f"{'='*60}")

        # Simulate some work with logging
        steps = random.randint(3, 6)
        for i in range(1, steps + 1):
            time.sleep(0.5)
            print(f"  [{job_name}] Step {i}/{steps} — processing...")

        result = {
            "status": "ok",
            "job": job_name,
            "steps_completed": steps,
            "message": f"Processed {steps} steps successfully",
        }

        response = json.dumps(result)
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(response.encode())

        print(f"  [{job_name}] Done! Responded 200 OK")

    def log_message(self, format, *args):
        # Suppress default access logs — we have our own
        pass

if __name__ == "__main__":
    port = 4444
    server = HTTPServer(("0.0.0.0", port), WebhookHandler)
    print(f"cronflow test webhook server running on http://localhost:{port}")
    print("Waiting for jobs...\n")
    server.serve_forever()
