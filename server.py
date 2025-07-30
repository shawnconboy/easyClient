#!/usr/bin/env python3
"""
Simple HTTP server for Single Page Applications (SPA)
Serves index.html for all routes that don't exist as files
"""

import http.server
import socketserver
import os
import mimetypes
from urllib.parse import unquote

class SPAHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Decode URL path
        path = unquote(self.path)
        
        # Remove query parameters
        if '?' in path:
            path = path.split('?')[0]
        
        # If it's a request for a specific file that exists, serve it normally
        if path != '/' and os.path.isfile('.' + path):
            return super().do_GET()
        
        # If it's a request for a directory or file that doesn't exist,
        # serve index.html (for SPA routing)
        if not os.path.isfile('.' + path) or path == '/':
            # Serve index.html
            self.path = '/index.html'
            return super().do_GET()
        
        # Default behavior for everything else
        return super().do_GET()

    def end_headers(self):
        # Add CORS headers if needed
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

if __name__ == '__main__':
    PORT = 3000
    
    with socketserver.TCPServer(("", PORT), SPAHTTPRequestHandler) as httpd:
        print(f"SPA Server running at http://localhost:{PORT}/")
        print("Press Ctrl+C to stop the server")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
