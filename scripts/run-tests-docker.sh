#!/bin/bash
# Helper script to run Playwright tests in Docker locally

set -e

echo "Building Docker image for tests..."
docker build -f Dockerfile.test -t lexin-extension-test .

echo "Running tests in Docker container..."
# --ipc=host is Playwright's recommendation for Chromium: without it the browser can
# run out of memory and crash. --init reaps zombies. CI=true is what
# playwright.config.ts gates retries, the github reporter and forbidOnly on - pass it
# so a local run behaves like the workflow rather than like a bare `docker run`.
docker run --rm \
  --name lexin-test \
  --ipc=host \
  --init \
  -e CI=true \
  -v "$(pwd)/playwright-report:/app/playwright-report" \
  -v "$(pwd)/test-results:/app/test-results" \
  lexin-extension-test

echo "Tests completed! Check playwright-report/ for HTML report."

