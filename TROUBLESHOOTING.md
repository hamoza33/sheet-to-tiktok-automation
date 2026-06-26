# Troubleshooting

This document covers every error that can appear in the STT-Deploy project logs, what causes it, and how to fix it.

---

## EROFS: read-only file system

```
EROFS: read-only file system, open '/app/credentials/service-account.json'
```

**Cause:** The Docker credentials volume is mounted as read-only (`:ro`), preventing the application from writing to the credentials directory.

**Fix:** Mount the volume as read-write by removing the `:ro` flag in `docker-compose.yml`, or ensure the application only needs to read the file (no writes to that path). Example:

```yaml
volumes:
  - ./credentials:/app/credentials  # remove :ro if writes are needed
```

---

## invalid_grant: Invalid JWT Signature

```
invalid_grant: Invalid JWT Signature
```

**Cause:** The Google service account credentials JSON file is invalid, expired, or the private key has been rotated on the Google Cloud side without updating the local file.

**Fix:** Regenerate the service account key in the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts), download the new JSON key file, and replace the existing credentials file used by the application.

---

## ENOENT: no such file or directory

```
ENOENT: no such file or directory, open '/app/credentials/service-account.json'
```

**Cause:** The credentials file path configured in the application does not match the actual file location. This typically happens when host paths and container paths are mismatched in the Docker volume mounts.

**Fix:** Verify the volume mount paths in `docker-compose.yml` match what the application expects. The host path (left side of `:`) must point to where the credentials file actually exists, and the container path (right side) must match the path the application is configured to use.

```yaml
volumes:
  - ./credentials:/app/credentials  # host path : container path
```

---

## getaddrinfo EAI_AGAIN

```
getaddrinfo EAI_AGAIN sheets.googleapis.com
```

**Cause:** DNS resolution is failing inside the Docker container. The container cannot resolve external hostnames, which prevents connecting to Google Sheets API, Buffer API, or any external service.

**Fix:** Add explicit DNS servers to the service in `docker-compose.yml`:

```yaml
services:
  stt-deploy:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

---

## address already in use (EADDRINUSE)

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause:** A port conflict exists because another process (e.g., PM2, another container, or a previous instance) is already using the same port.

**Fix:** Stop the conflicting process, or change the `HEALTH_CHECK_PORT` environment variable to use a different port. To find what is using the port:

```bash
# Find the process using the port
lsof -i :3000
# Or inside Docker, check for other containers using the same port
docker ps --format '{{.Names}} {{.Ports}}'
```

---

## Not authorized to access this resource

```
Not authorized to access this resource
```

**Cause:** The Buffer API access token does not have the required permissions or scopes to perform the requested action (e.g., publishing posts, reading channels).

**Fix:** Generate a new access token with the correct permissions in [Buffer settings](https://buffer.com/developers/apps). Make sure the token has access to the channels you are trying to publish to, then update the `BUFFER_ACCESS_TOKEN` in your `.env` file or workflow configuration.

---

## Unknown Buffer API error

```
Unknown Buffer API error
```

**Cause:** The Buffer GraphQL mutation returned an unexpected error that does not match any known error pattern. This could be a temporary Buffer service issue, an invalid channel ID, or a malformed request.

**Fix:**
1. Check the [Buffer API status page](https://status.buffer.com/) for any ongoing incidents.
2. Verify the channel ID in your workflow configuration is correct and the channel still exists in your Buffer account.
3. Inspect the full error details in the application logs (the complete GraphQL response is logged at debug level).

---

## Worksheet not found

```
Worksheet not found
```

**Cause:** The worksheet tab name specified in the workflow configuration does not match any tab in the Google Sheet. Tab names are case-sensitive.

**Fix:** Open the Google Sheet and verify the exact tab name (including capitalization, spaces, and special characters). Update the workflow configuration to match the exact tab name as it appears in the sheet.

---

## SheetPoller not authenticated

```
SheetPoller not authenticated
```

**Cause:** The `authenticate()` method was not called before attempting to fetch rows from the Google Sheet. This usually means the service failed to initialize properly due to an earlier authentication error.

**Fix:** Check the startup logs for earlier authentication errors (such as `invalid_grant` or `ENOENT` errors listed above). Ensure the service initializes properly by fixing any upstream credential issues. The application must successfully authenticate before polling can begin.

---

## Buffer timeout / retry exhausted

```
Buffer API request timed out
```
```
All retry attempts exhausted for Buffer API
```

**Cause:** The Buffer API did not respond within the configured timeout, or all retry attempts failed. This can happen due to network connectivity issues, Buffer API being slow or down, or overly aggressive timeout settings.

**Fix:**
1. Check network connectivity from the container (see the DNS section above if resolution also fails).
2. Check the [Buffer API status page](https://status.buffer.com/) for any incidents.
3. Consider increasing the timeout or retry settings in your configuration if the issue is intermittent.

---

## Dashboard "Invalid password"

```
Invalid password
```

**Cause:** The password entered on the dashboard login page does not match the `DASHBOARD_PASSWORD` environment variable configured for the application.

**Fix:** Verify the `DASHBOARD_PASSWORD` value in your `.env` file matches what you are entering in the login form. Remember that the value is case-sensitive and should not have leading or trailing whitespace. After updating the `.env` file, restart the application for the change to take effect.
