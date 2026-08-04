# Docker Testing Guide

This guide explains how to run Playwright E2E tests in a Docker container, which is useful for:
- Ensuring tests work in CI environments
- Testing in a clean, isolated environment
- Debugging CI test failures locally

## Prerequisites

- Docker installed and running
- Docker Compose (optional, for easier local testing)

## Running Tests in Docker

### Option 1: Using the Helper Script

```bash
npm run test:e2e:docker
```

This script will:
1. Build the Docker image
2. Run all E2E tests
3. Mount test results directories for easy access

### Option 2: Using Docker Compose

```bash
docker-compose -f docker-compose.test.yml up --build
```

### Option 3: Manual Docker Commands

```bash
# Build the image
docker build -f Dockerfile.test -t lexin-extension-test .

# Run tests
docker run --rm \
  --name lexin-test \
  -v "$(pwd)/playwright-report:/app/playwright-report" \
  -v "$(pwd)/test-results:/app/test-results" \
  lexin-extension-test
```

## How It Works

The Docker setup:
1. Uses the official Playwright image as base, pinned to the same version as
   `@playwright/test` in `package.json` - the image ships the browser set of its own
   version, so a drift means downloading a second one on every build
2. Builds the extension from source
3. Runs the tests headless, on the full Chromium build (`channel: "chromium"`)
4. Exports test results and reports as volumes

There is no display involved and no Xvfb: that came with the headed run, and went
with it.

## Test Results

After running tests, you'll find:
- **HTML Report**: `playwright-report/index.html` - Open in browser to view detailed test results
- **Test Artifacts**: `test-results/` - Screenshots, videos, and traces from failed tests

## CI Integration

The GitHub Actions workflow (`.github/workflows/test.yml`) automatically:
- Builds the Docker image
- Runs all tests
- Uploads test artifacts and reports as GitHub Actions artifacts

## Troubleshooting

### Tests fail with display errors
- The suite runs headless, so a display error means something asked for a window - a
  `--headed` run, or `channel: "chromium"` missing from the Playwright config
- The base image still carries Xvfb, so `xvfb-run npx playwright test --headed` works
  inside the container - but nothing there can show you the screen. To actually watch
  a run, use `npm run test:e2e:headed` on the host

### Extension not loading
- Verify the extension was built successfully (`dist/` folder exists)
- Check `channel: "chromium"` is still in `playwright.config.ts`: without it a
  headless run gets the headless shell, which loads no extensions at all
- Check that the extension path is correct in the test fixtures

### Chromium crashes or runs out of memory
- Check the run passes `--ipc=host`: Playwright recommends it for Chromium, and
  `scripts/run-tests-docker.sh`, the compose file and the workflow all set it

### Network timeouts
- Tests require internet access to reach Lexin API
- Ensure Docker container has network access

## Local Development vs Docker

- **Local**: Run `npm run test:e2e` for faster iteration
- **Docker**: Run `npm run test:e2e:docker` to match CI environment exactly

