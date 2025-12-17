#!/bin/bash
# Helper script to run Playwright tests in Docker locally

set -e

echo "Building Docker image for tests..."
docker build -f Dockerfile.test -t lexin-extension-test .

echo "Running tests in Docker container..."
docker run --rm \
  --name lexin-test \
  -v "$(pwd)/playwright-report:/app/playwright-report" \
  -v "$(pwd)/test-results:/app/test-results" \
  lexin-extension-test

echo "Tests completed! Check playwright-report/ for HTML report."

