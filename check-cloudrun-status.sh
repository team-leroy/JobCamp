#!/bin/bash

# Check Cloud Run deployment status and logs

echo "=== Cloud Run Service Status ==="
gcloud run services describe github-actions-jobcamp \
  --project=deep-voyage-436902-b3 \
  --region=us-central1 \
  --format="table(status.url, status.conditions[0].type, status.conditions[0].status, status.latestReadyRevisionName)"

echo ""
echo "=== Latest Revisions ==="
gcloud run revisions list \
  --service=github-actions-jobcamp \
  --project=deep-voyage-436902-b3 \
  --region=us-central1 \
  --limit=5 \
  --format="table(metadata.name, status.conditions[0].status, metadata.creationTimestamp)"

echo ""
echo "=== Recent Logs (last 100 lines) ==="
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=github-actions-jobcamp" \
  --project=deep-voyage-436902-b3 \
  --limit=100 \
  --format="table(timestamp, severity, textPayload)" \
  --order=desc

echo ""
echo "=== Stream Live Logs (Ctrl+C to stop) ==="
gcloud run services logs tail github-actions-jobcamp \
  --project=deep-voyage-436902-b3 \
  --region=us-central1



