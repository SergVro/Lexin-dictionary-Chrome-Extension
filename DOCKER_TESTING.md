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
1. Uses the official Playwright Docker image as base
2. Installs Xvfb (X Virtual Framebuffer) for virtual display support
3. Builds the extension from source
4. Runs tests with a virtual display (required for Chrome extensions)
5. Exports test results and reports as volumes

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
- Ensure Xvfb is running (handled automatically in the Docker container)
- Check that the DISPLAY environment variable is set to `:99`

### Extension not loading
- Verify the extension was built successfully (`dist/` folder exists)
- Check that the extension path is correct in the test fixtures

### Network timeouts
- Tests require internet access to reach Lexin API
- Ensure Docker container has network access

## Local Development vs Docker

- **Local**: Run `npm run test:e2e` for faster iteration
- **Docker**: Run `npm run test:e2e:docker` to match CI environment exactly

