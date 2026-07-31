#!/usr/bin/env bash
#
# One-time Workload Identity Federation setup for the tag-driven Chrome Web
# Store release workflow (.github/workflows/release.yml).
#
# Creates the Google Cloud project, publisher service account, workload
# identity pool and GitHub OIDC provider, then the protected GitHub
# environment and the variables release.yml reads. Idempotent - every step
# checks before it acts, so re-running is safe.
#
# Prerequisites: gcloud and gh installed, both authenticated as an account
# that can create GCP projects and administer this repository.
#
# Usage:
#   bash scripts/webstore/setup-wif.sh
#
#   CWS_PUBLISHER_ID=xxx CWS_EXTENSION_ID=yyy bash scripts/webstore/setup-wif.sh
#
# Any setting in section 0 can be overridden the same way.
#
# Note: IAM permission checks lag freshly enabled APIs by up to a minute, so
# a first run can fail at section 4 with PERMISSION_DENIED on a brand-new
# project. That is a propagation race, not a misconfiguration - wait a moment
# and re-run.

set -euo pipefail

# ---------------------------------------------------------------------------
# 0. Settings
# ---------------------------------------------------------------------------
PROJECT_ID="${PROJECT_ID:-lexin-extension-release}"
PROJECT_NAME="${PROJECT_NAME:-Lexin Extension Release}"
POOL_ID="${POOL_ID:-github}"
PROVIDER_ID="${PROVIDER_ID:-github-actions}"
SA_NAME="${SA_NAME:-chrome-web-store-publisher}"
REPO="${REPO:-SergVro/Lexin-dictionary-Chrome-Extension}"
ENVIRONMENT="${ENVIRONMENT:-chrome-web-store-production}"
TAG_PATTERN="${TAG_PATTERN:-v*.*.*}"

# Immutable numeric IDs - these survive a repo or account rename, which the
# string names do not. Re-read with:
#   gh api "repos/$REPO" --jq '.id, .owner.id'
REPO_ID="${REPO_ID:-2455224}"
OWNER_ID="${OWNER_ID:-892980}"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

# ---------------------------------------------------------------------------
# 1. Create (or reuse) the Google Cloud project
# ---------------------------------------------------------------------------
if gcloud projects describe "$PROJECT_ID" >/dev/null 2>&1; then
  echo "Project $PROJECT_ID already exists - continuing."
else
  gcloud projects create "$PROJECT_ID" --name="$PROJECT_NAME"
fi

gcloud config set project "$PROJECT_ID"

PROJECT_NUMBER="$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')"
echo "Project number: $PROJECT_NUMBER"

# If API enablement below fails with a billing error, link a billing account:
#   gcloud billing accounts list
#   gcloud billing projects link "$PROJECT_ID" --billing-account=XXXXXX-XXXXXX-XXXXXX

# ---------------------------------------------------------------------------
# 2. Enable the required APIs
#
#    iamcredentials is what backs release.yml's `token_format: access_token`
#    (it calls generateAccessToken after the STS exchange).
# ---------------------------------------------------------------------------
gcloud services enable \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com \
  chromewebstore.googleapis.com \
  cloudresourcemanager.googleapis.com \
  --project="$PROJECT_ID"

# ---------------------------------------------------------------------------
# 3. Create the publisher service account
#
#    Deliberately no project-level IAM roles: the Chrome Web Store authorizes
#    this account through the Developer Dashboard linkage, not through GCP.
# ---------------------------------------------------------------------------
if gcloud iam service-accounts describe "$SA_EMAIL" --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Service account already exists - continuing."
else
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Chrome Web Store publisher" \
    --project="$PROJECT_ID"
fi

echo "Service account: $SA_EMAIL"

# ---------------------------------------------------------------------------
# 4. Create the workload identity pool
# ---------------------------------------------------------------------------
if gcloud iam workload-identity-pools describe "$POOL_ID" \
     --location=global --project="$PROJECT_ID" >/dev/null 2>&1; then
  echo "Pool already exists - continuing."
else
  gcloud iam workload-identity-pools create "$POOL_ID" \
    --location=global \
    --display-name="GitHub Actions" \
    --description="OIDC federation for GitHub Actions" \
    --project="$PROJECT_ID"
fi

# ---------------------------------------------------------------------------
# 5. Create the GitHub OIDC provider
#
#    Google requires an attribute condition for shared issuers like GitHub -
#    without one, any repository on GitHub could mint tokens for this project.
#    The condition mirrors release.yml: this repo, a v* tag, and the protected
#    environment. It is matched on numeric IDs rather than names so that a
#    freed-up repo name cannot inherit the trust.
# ---------------------------------------------------------------------------
if gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
     --location=global --workload-identity-pool="$POOL_ID" \
     --project="$PROJECT_ID" >/dev/null 2>&1; then
  PROVIDER_VERB="update-oidc"
  echo "Provider already exists - updating it in place."
else
  PROVIDER_VERB="create-oidc"
fi

gcloud iam workload-identity-pools providers "$PROVIDER_VERB" "$PROVIDER_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --display-name="GitHub" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.repository_owner=assertion.repository_owner,attribute.ref=assertion.ref,attribute.environment=assertion.environment,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository_id == '${REPO_ID}' && assertion.repository_owner_id == '${OWNER_ID}' && assertion.ref_type == 'tag' && assertion.ref.startsWith('refs/tags/v') && assertion.environment == '${ENVIRONMENT}'" \
  --project="$PROJECT_ID"

# ---------------------------------------------------------------------------
# 6. Let the repo's federated identity impersonate the service account
#
#    Bound on attribute.repository rather than the subject: because the
#    publish job declares an environment, GitHub sets `sub` to
#    repo:OWNER/REPO:environment:NAME rather than the ref form.
# ---------------------------------------------------------------------------
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL_ID}/attribute.repository/${REPO}" \
  --project="$PROJECT_ID"

# ---------------------------------------------------------------------------
# 7. Read back the provider resource name (this is GCP_WIF_PROVIDER)
# ---------------------------------------------------------------------------
WIF_PROVIDER="$(gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global \
  --workload-identity-pool="$POOL_ID" \
  --project="$PROJECT_ID" \
  --format='value(name)')"
echo "GCP_WIF_PROVIDER: $WIF_PROVIDER"

# ---------------------------------------------------------------------------
# 8. Create the protected GitHub environment
# ---------------------------------------------------------------------------
gh api -X PUT "repos/${REPO}/environments/${ENVIRONMENT}" --input - >/dev/null <<JSON
{
  "wait_timer": 0,
  "prevent_self_review": false,
  "reviewers": [{"type": "User", "id": ${OWNER_ID}}],
  "deployment_branch_policy": {
    "protected_branches": false,
    "custom_branch_policies": true
  }
}
JSON
echo "Environment $ENVIRONMENT configured."

# Restrict the environment to version tags, so no branch can deploy to it.
# Belt and braces with the provider condition in section 5: GitHub refuses to
# run the job, and independently GCP refuses to mint a token.
if gh api "repos/${REPO}/environments/${ENVIRONMENT}/deployment-branch-policies" \
     --jq '.branch_policies[] | select(.type == "tag") | .name' 2>/dev/null \
     | grep -Fqx "$TAG_PATTERN"; then
  echo "Tag policy $TAG_PATTERN already exists - continuing."
else
  gh api -X POST "repos/${REPO}/environments/${ENVIRONMENT}/deployment-branch-policies" \
    -f name="$TAG_PATTERN" -f type=tag >/dev/null
  echo "Tag policy $TAG_PATTERN created."
fi

# ---------------------------------------------------------------------------
# 9. Set the environment variables consumed by release.yml
# ---------------------------------------------------------------------------
gh variable set GCP_PROJECT_ID      --env "$ENVIRONMENT" --repo "$REPO" --body "$PROJECT_ID"
gh variable set GCP_WIF_PROVIDER    --env "$ENVIRONMENT" --repo "$REPO" --body "$WIF_PROVIDER"
gh variable set GCP_SERVICE_ACCOUNT --env "$ENVIRONMENT" --repo "$REPO" --body "$SA_EMAIL"

# Read from the Chrome Web Store Developer Dashboard; pass them in the
# environment to have them set here (see Usage at the top of this file).
if [ -n "${CWS_PUBLISHER_ID:-}" ]; then
  gh variable set CWS_PUBLISHER_ID --env "$ENVIRONMENT" --repo "$REPO" --body "$CWS_PUBLISHER_ID"
else
  echo "CWS_PUBLISHER_ID not provided - skipping (set it before the first release)."
fi

if [ -n "${CWS_EXTENSION_ID:-}" ]; then
  gh variable set CWS_EXTENSION_ID --env "$ENVIRONMENT" --repo "$REPO" --body "$CWS_EXTENSION_ID"
else
  echo "CWS_EXTENSION_ID not provided - skipping (set it before the first release)."
fi

# ---------------------------------------------------------------------------
# 10. Verify
# ---------------------------------------------------------------------------
echo
echo "=== Provider ==="
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global --workload-identity-pool="$POOL_ID" --project="$PROJECT_ID" \
  --format='yaml(name,attributeMapping,attributeCondition,oidc.issuerUri,state)'

echo "=== Service account IAM policy ==="
gcloud iam service-accounts get-iam-policy "$SA_EMAIL" --project="$PROJECT_ID" --format=json

echo "=== GitHub environment variables ==="
gh variable list --env "$ENVIRONMENT" --repo "$REPO"

echo
echo "Remaining manual step: add ${SA_EMAIL}"
echo "under the Chrome Web Store Developer Dashboard > Account section."
echo "There is no API for that linkage."
