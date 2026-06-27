# Zap2 Troubleshooting Guide

This document covers every error that can appear in the Zap2 application logs, what causes it, and how to fix it.

---

## Table of Contents

- [Configuration Errors](#configuration-errors)
- [Google Sheets API Errors](#google-sheets-api-errors)
- [Buffer API Errors](#buffer-api-errors)
- [Workflow Management Errors](#workflow-management-errors)
- [Dashboard Errors](#dashboard-errors)
- [System and Docker Errors](#system-and-docker-errors)
- [Network Errors](#network-errors)

---

## Configuration Errors

### 1. Missing googleSheetId

```
Configuration invalid:
  - googleSheetId (SHEET_ID) is required and must be a non-empty string
```

**Cause:** The `SHEET_ID` environment variable is not set and no `sheetId` value is present in `config.json`.

**Fix:** Set the `SHEET_ID` environment variable in your `.env` file or provide the value in `config.json`:

```bash
# .env
SHEET_ID=your-google-sheet-id-here
```

The Sheet ID is the long string in the Google Sheets URL between `/d/` and `/edit`:
`https://docs.google.com/spreadsheets/d/THIS_IS_THE_SHEET_ID/edit`

---

### 2. Missing worksheetName

```
Configuration invalid:
  - worksheetName (WORKSHEET_NAME) is required and must be a non-empty string
```

**Cause:** The `WORKSHEET_NAME` environment variable is not set and no `worksheetName` value is present in `config.json`.

**Fix:** Set the `WORKSHEET_NAME` environment variable to the exact name of the tab in your Google Sheet:

```bash
# .env
WORKSHEET_NAME=Sheet1
```

Note: Tab names are case-sensitive. Make sure it matches exactly what you see in Google Sheets.

---

### 3. Missing googleCredentialsPath

```
Configuration invalid:
  - googleCredentialsPath (GOOGLE_CREDENTIALS_PATH) is required and must be a non-empty string
```

**Cause:** The `GOOGLE_CREDENTIALS_PATH` environment variable is not set and no `googleCredentialsPath` value is present in `config.json`.

**Fix:** Set the path to your Google service account credentials JSON file:

```bash
# .env
GOOGLE_CREDENTIALS_PATH=./credentials/service-account.json
```

---

### 4. Missing bufferAccessToken

```
Configuration invalid:
  - bufferAccessToken (BUFFER_ACCESS_TOKEN) is required and must be a non-empty string
```

**Cause:** The `BUFFER_ACCESS_TOKEN` environment variable is not set and no `bufferAccessToken` value is present in `config.json`.

**Fix:** Generate an access token from your [Buffer Developer Apps](https://buffer.com/developers/apps) and set it:

```bash
# .env
BUFFER_ACCESS_TOKEN=your-buffer-access-token-here
```

---

### 5. Missing bufferChannelId

```
Configuration invalid:
  - bufferChannelId (BUFFER_CHANNEL_ID) is required and must be a non-empty string
```

**Cause:** The `BUFFER_CHANNEL_ID` environment variable is not set and no `bufferChannelId` value is present in `config.json`.

**Fix:** Find your channel ID from the Buffer dashboard or API and set it:

```bash
# .env
BUFFER_CHANNEL_ID=your-buffer-channel-id-here
```

You can find your channel ID by using the Settings > Buffer API Tester in the Zap2 dashboard, or query the Buffer API directly.

---

### 6. Invalid pollingIntervalSeconds (not a number)

```
Configuration invalid:
  - pollingIntervalSeconds (POLLING_INTERVAL_SECONDS) must be a valid number
```

**Cause:** The `POLLING_INTERVAL_SECONDS` environment variable contains a non-numeric value (e.g., `"fast"`, `"10s"`, or an empty string after variable expansion).

**Fix:** Set it to a plain integer between 10 and 300:

```bash
# .env
POLLING_INTERVAL_SECONDS=60
```

---

### 7. Invalid pollingIntervalSeconds (out of range)

```
Configuration invalid:
  - pollingIntervalSeconds (POLLING_INTERVAL_SECONDS) must be between 10 and 300
```

**Cause:** The polling interval is set to a value less than 10 or greater than 300 seconds.

**Fix:** Choose a value between 10 and 300 seconds. A recommended default is 60:

```bash
# .env
POLLING_INTERVAL_SECONDS=60
```

Values below 10 are rejected to prevent excessive API calls. Values above 300 are rejected to ensure timely processing.

---

### 8. Invalid healthCheckPort

```
Configuration invalid:
  - healthCheckPort (HEALTH_CHECK_PORT) must be a valid number
```

**Cause:** The `HEALTH_CHECK_PORT` environment variable contains a non-numeric value.

**Fix:** Set it to a valid port number:

```bash
# .env
HEALTH_CHECK_PORT=3000
```

---

### 9. Credentials file does not exist

```
Configuration invalid:
  - googleCredentialsPath (GOOGLE_CREDENTIALS_PATH) file does not exist: ./credentials/service-account.json
```

**Cause:** The path specified for Google credentials points to a file that does not exist on disk.

**Fix:** Ensure the credentials file exists at the specified path. For Docker deployments, verify the volume mount:

```bash
# Check if the file exists
ls -la ./credentials/service-account.json

# For Docker, verify your docker-compose.yml volume mount:
# volumes:
#   - ./credentials:/app/credentials
```

---

### 10. Multiple configuration errors

```
Configuration invalid:
  - googleSheetId (SHEET_ID) is required and must be a non-empty string
  - worksheetName (WORKSHEET_NAME) is required and must be a non-empty string
  - bufferAccessToken (BUFFER_ACCESS_TOKEN) is required and must be a non-empty string
```

**Cause:** Multiple required configuration values are missing. This typically happens on first deployment when the `.env` file has not been configured.

**Fix:** Copy the example environment file and fill in all required values:

```bash
cp .env.example .env
# Edit .env with your actual values
```

---

## Google Sheets API Errors

### 11. Invalid JWT Signature

```
invalid_grant: Invalid JWT Signature
```

**Cause:** The Google service account credentials JSON file is invalid, expired, or the private key has been rotated on the Google Cloud side without updating the local file.

**Fix:** Regenerate the service account key in the [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts), download the new JSON key file, and replace the existing credentials file. If using the dashboard, update the workflow with the new credentials JSON.

---

### 12. Invalid JWT (malformed credentials)

```
Error: error:1E08010C:DECODER routines::unsupported
```

**Cause:** The credentials JSON file is malformed or the private key field is corrupted. This often happens when credentials are copy-pasted incorrectly or when the JSON is double-escaped.

**Fix:** Re-download the original credentials JSON from Google Cloud Console. When pasting credentials into the dashboard, paste the raw JSON content without any extra escaping:

```bash
# Verify the credentials file is valid JSON
cat credentials/service-account.json | python3 -m json.tool
```

---

### 13. SheetPoller not authenticated

```
SheetPoller not authenticated. Call authenticate() first.
```

**Cause:** The application attempted to fetch rows from Google Sheets before the authentication step completed. This usually means the service failed to initialize due to an earlier authentication error.

**Fix:** Check the startup logs for authentication errors that occurred before this message (such as `invalid_grant`, `ENOENT`, or JSON parse errors). Fix the underlying credential issue and restart the service.

---

### 14. Worksheet not found

```
Worksheet "MySheet" not found in spreadsheet.
```

**Cause:** The worksheet tab name specified in the workflow configuration does not match any tab in the Google Sheet. Tab names are case-sensitive and must match exactly.

**Fix:** Open the Google Sheet and verify the exact tab name (including capitalization, spaces, and special characters). Update the workflow configuration to match:

```bash
# Example: if the tab is "Content Schedule" (with a space)
WORKSHEET_NAME=Content Schedule
```

---

### 15. Permission denied (403)

```
Google API Error: The caller does not have permission
```

**Cause:** The Google service account does not have access to the specified spreadsheet. The sheet must be explicitly shared with the service account email.

**Fix:** Share the Google Sheet with the service account email address (found in the credentials JSON as `client_email`):

1. Open your Google Sheet
2. Click "Share"
3. Add the service account email (e.g., `zap-228@project-id.iam.gserviceaccount.com`)
4. Give it "Editor" access

---

### 16. Spreadsheet not found (404)

```
Requested entity was not found.
```

**Cause:** The Google Sheet ID in the configuration does not correspond to any existing spreadsheet, or the spreadsheet has been deleted.

**Fix:** Verify the Sheet ID is correct. The ID is the long string in the URL:
`https://docs.google.com/spreadsheets/d/SHEET_ID_HERE/edit`

```bash
# Double-check your configured Sheet ID
echo $SHEET_ID
```

---

### 17. Quota exceeded (429)

```
Quota exceeded for quota metric 'Read requests' and limit 'Read requests per minute per user'
```

**Cause:** The application is making too many requests to the Google Sheets API. The default rate limit is 60 read requests per minute per user.

**Fix:** Increase the polling interval to reduce API call frequency:

```bash
# .env
POLLING_INTERVAL_SECONDS=120
```

If you have multiple workflows polling the same sheet, consider consolidating them or staggering their intervals.

---

### 18. DEADLINE_EXCEEDED

```
DEADLINE_EXCEEDED: Deadline exceeded
```

**Cause:** The Google Sheets API took too long to respond. This can happen with very large spreadsheets or during Google service degradation.

**Fix:**
1. Check [Google Workspace Status](https://www.google.com/appsstatus) for any ongoing incidents.
2. If the sheet is very large (thousands of rows), consider archiving processed rows to a separate sheet.
3. The application will retry on the next poll cycle automatically.

---

### 19. JSON parse error on credentials

```
SyntaxError: Unexpected token in JSON at position 0
```

**Cause:** The credentials file is not valid JSON. It may be empty, truncated, or contain non-JSON content (such as a shell error message written to the file).

**Fix:** Verify the credentials file contains valid JSON:

```bash
# Check if the file is valid JSON
cat credentials/service-account.json | python3 -m json.tool

# If corrupted, re-download from Google Cloud Console
```

---

## Buffer API Errors

### 20. Unknown Buffer API error

```
Unknown Buffer API error
```

**Cause:** The Buffer GraphQL mutation returned a `MutationError` with no specific message. This could indicate an invalid channel ID, a malformed request, or a temporary Buffer service issue.

**Fix:**
1. Verify the channel ID in your workflow configuration is correct and the channel still exists in your Buffer account.
2. Check the [Buffer Status page](https://status.buffer.com/) for any ongoing incidents.
3. Use the Settings > Buffer API Tester in the dashboard to verify your token and channel are valid.

---

### 21. Buffer API request timed out

```
The operation was aborted
```

**Cause:** The Buffer API did not respond within the 30-second timeout. This indicates network issues, Buffer API being slow or down, or connectivity problems from the deployment environment.

**Fix:**
1. Check network connectivity from the server.
2. Check the [Buffer Status page](https://status.buffer.com/) for any incidents.
3. The application will automatically retry up to 3 times with a 5-second delay between attempts.
4. If persistent, verify outbound HTTPS traffic to `api.buffer.com` is not blocked by a firewall.

---

### 22. All retry attempts exhausted

```
All 3 retry attempts exhausted
```

**Cause:** The Buffer API request failed 3 consecutive times. Each attempt waits 5 seconds before retrying. The underlying error could be a timeout, network failure, or persistent API error.

**Fix:**
1. Check the preceding error messages in the logs to identify the specific failure.
2. Verify the Buffer access token has not expired by testing it in Settings > Buffer API Tester.
3. If the Buffer API is experiencing an outage, wait for it to recover. The next poll cycle will retry automatically.

---

### 23. Buffer authentication error (401/403)

```
Not authorized to access this resource
```

**Cause:** The Buffer API access token does not have the required permissions or has been revoked.

**Fix:** Generate a new access token with the correct permissions in [Buffer Developer Apps](https://buffer.com/developers/apps). Update the token in your workflow configuration through the dashboard or environment variables:

```bash
# .env (for legacy single-workflow mode)
BUFFER_ACCESS_TOKEN=your-new-token-here
```

---

### 24. Buffer channel not found

```
Channel not found
```

**Cause:** The Buffer channel ID specified in the workflow configuration does not correspond to any channel in the Buffer account associated with the access token.

**Fix:**
1. Go to Settings > Buffer API Tester in the dashboard.
2. Enter your Buffer access token and click "Test Connection."
3. The response will list your available channels with their IDs.
4. Update your workflow configuration with the correct channel ID.

---

## Workflow Management Errors

### 25. Failed to save workflows.json

```
Failed to save workflows.json
```

**Cause:** The application could not write the `workflows.json` file to disk. This can happen due to permission issues, a read-only filesystem, or disk space being full.

**Fix:**

For Docker deployments:
```bash
# Ensure the app directory is writable
docker exec <container> ls -la /app/workflows.json

# Check disk space
docker exec <container> df -h /app
```

For VPS/PM2 deployments:
```bash
# Check file permissions
ls -la workflows.json

# Check disk space
df -h .

# Fix permissions if needed
chmod 644 workflows.json
chown $(whoami) workflows.json
```

---

### 26. Failed to read credentials for workflow duplication

```
Failed to read credentials for workflow duplication
```

**Cause:** When duplicating a workflow, the application could not read the credentials file associated with the source workflow. The file may have been deleted or permissions changed.

**Fix:**
1. Check if the credentials file still exists in the `credentials/` directory.
2. If the file was deleted, edit the original workflow and re-upload the credentials JSON before attempting duplication.

```bash
ls -la credentials/workflow-*.json
```

---

### 27. Workflow not found (API response)

```json
{"success": false, "message": "Workflow not found"}
```

**Cause:** An API request referenced a workflow ID that does not exist. The workflow may have been deleted, or the ID is incorrect.

**Fix:** Refresh the workflows page in the dashboard to see the current list of workflows. If a workflow was deleted, it cannot be recovered.

---

### 28. Failed to start workflow (authentication failure)

```
Failed to start workflow "My Workflow"
```

**Cause:** The workflow could not authenticate with Google Sheets during startup. The Google credentials are invalid, expired, or the service account has been deleted.

**Fix:**
1. Check the workflow's error message in the dashboard for the specific authentication error.
2. Update the workflow's Google credentials with a valid service account JSON.
3. Ensure the service account still exists in the Google Cloud Console.

---

### 29. Poll cycle failed

```
Poll cycle failed for "My Workflow"
```

**Cause:** An unhandled error occurred during a polling cycle. The workflow will show an "error" status and include the error message. Common causes include network failures, Google API errors, or credential expiration.

**Fix:**
1. Check the error message displayed on the workflow in the dashboard.
2. If the error is transient (network timeout, API rate limit), the workflow will recover on the next poll cycle.
3. If the error is persistent (invalid credentials, permission denied), fix the underlying issue and restart the workflow from the dashboard.

---

### 30. Missing required fields when creating workflow

```json
{"success": false, "message": "Missing required fields (name, sheetId)"}
```

**Cause:** A workflow creation request was made through the API without providing the required `name` and `sheetId` fields.

**Fix:** Ensure you provide at least `name` and `sheetId` when creating a workflow. Use the dashboard form which validates required fields before submission.

---

## Dashboard Errors

### 31. Invalid password

```
Invalid password. Please try again.
```

**Cause:** The password entered on the dashboard login page does not match the `DASHBOARD_PASSWORD` environment variable configured for the application.

**Fix:** Verify the `DASHBOARD_PASSWORD` value in your `.env` file matches what you are entering. The value is case-sensitive and should not have leading or trailing whitespace:

```bash
# .env
DASHBOARD_PASSWORD=your-secure-password
```

The default password (if not set) is `admin123`. After updating the `.env` file, restart the application.

---

### 32. Session expired (Unauthorized)

```json
{"error": "Unauthorized"}
```

**Cause:** The dashboard session has expired (sessions last 24 hours) or the session cookie is invalid/missing. API requests return a 401 JSON error; browser requests redirect to `/login`.

**Fix:** Log in again through the dashboard login page. If this happens immediately after login, ensure cookies are enabled in your browser and that no proxy is stripping the `Set-Cookie` header.

---

### 33. Redirect to /login on every request

**Cause:** The session cookie is not being sent with requests. This can happen when:
- The application is behind a reverse proxy that strips cookies
- The browser blocks third-party cookies
- The application URL changed (cookies are path-scoped)

**Fix:**
1. If using a reverse proxy (nginx, Caddy), ensure it passes cookies through:
```nginx
location / {
    proxy_pass http://localhost:3000;
    proxy_set_header Cookie $http_cookie;
    proxy_pass_header Set-Cookie;
}
```
2. Access the dashboard using the same URL consistently (do not switch between IP and domain name).

---

## System and Docker Errors

### 34. EROFS: read-only file system

```
EROFS: read-only file system, open '/app/credentials/service-account.json'
```

**Cause:** The Docker container filesystem or a volume is mounted as read-only, preventing the application from writing files (workflows.json, processed-rows, credentials).

**Fix:** Ensure volumes that need write access are not mounted with `:ro`:

```yaml
# docker-compose.yml
volumes:
  - ./credentials:/app/credentials     # remove :ro if writes are needed
  - ./data:/app/data                    # workflow data directory
```

---

### 35. ENOENT: no such file or directory

```
ENOENT: no such file or directory, open '/app/credentials/service-account.json'
```

**Cause:** The credentials file path does not exist. In Docker, this happens when volume mounts are misconfigured. On VPS, the path may be wrong relative to the working directory.

**Fix (Docker):** Verify volume mount paths in `docker-compose.yml`:

```yaml
volumes:
  - ./credentials:/app/credentials  # host path : container path
```

Ensure the host directory exists and contains the credentials file:
```bash
ls -la ./credentials/
```

**Fix (VPS/PM2):** Ensure the path is correct relative to where the process starts:

```bash
# Check what path the app expects
grep GOOGLE_CREDENTIALS_PATH .env

# Verify the file exists at that path
ls -la credentials/service-account.json
```

---

### 36. EADDRINUSE: address already in use

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Cause:** Another process is already listening on the same port (default 3000). This happens when another instance of Zap2 is running, or another application uses the same port.

**Fix:** Find and stop the conflicting process, or change the port:

```bash
# Find what is using port 3000
lsof -i :3000
# or
ss -tlnp | grep 3000

# Change the port in .env
HEALTH_CHECK_PORT=3001
```

For Docker:
```bash
# Check for other containers using the port
docker ps --format '{{.Names}} {{.Ports}}'
```

For PM2:
```bash
# Check for zombie processes
pm2 list
pm2 stop all
pm2 start ecosystem.config.js
```

---

### 37. EPERM or EACCES: permission denied

```
EACCES: permission denied, open '/app/workflows.json'
```
```
EPERM: operation not permitted, open '/app/credentials/workflow-abc.json'
```

**Cause:** The application process does not have filesystem permissions to read or write the required file.

**Fix (Docker):** Ensure the container user has write permissions. If running as non-root, set proper ownership:

```dockerfile
# In Dockerfile
RUN chown -R node:node /app
USER node
```

Or adjust volume permissions:
```bash
chmod -R 755 ./credentials
chmod -R 755 ./data
```

**Fix (VPS):** Fix ownership so the PM2/node process user can access files:
```bash
chown -R $(whoami):$(whoami) credentials/ workflows.json
chmod 644 workflows.json
chmod 600 credentials/*.json
```

---

### 38. Out of memory (JavaScript heap)

```
FATAL ERROR: Reached heap limit Allocation failed - JavaScript heap out of memory
```

**Cause:** The Node.js process exceeded its memory limit. This can happen with very large spreadsheets (thousands of rows) or if memory leaks accumulate over time.

**Fix:**

Increase the Node.js memory limit:
```bash
# For PM2, set in ecosystem.config.js:
node_args: '--max-old-space-size=512'

# For Docker, set in docker-compose.yml:
environment:
  - NODE_OPTIONS=--max-old-space-size=512
```

If the issue persists, consider:
- Archiving processed rows from your Google Sheets
- Reducing the number of simultaneous workflows
- Restarting the service periodically (PM2 does this automatically with `max_memory_restart`)

---

### 39. Unhandled fatal error on startup

```
Unhandled fatal error: Error: ...
```

**Cause:** The `main()` function threw an unrecoverable error during startup. The specific error message following this prefix indicates the root cause.

**Fix:** Read the full error message that follows. Common causes:
- Configuration errors (see Configuration Errors section above)
- Port already in use (see EADDRINUSE)
- Missing dependencies (run `npm install`)

---

## Network Errors

### 40. getaddrinfo EAI_AGAIN (DNS failure)

```
getaddrinfo EAI_AGAIN sheets.googleapis.com
```
```
getaddrinfo EAI_AGAIN api.buffer.com
```

**Cause:** DNS resolution is failing. The application cannot resolve external hostnames to connect to Google Sheets API or Buffer API.

**Fix (Docker):** Add explicit DNS servers in `docker-compose.yml`:

```yaml
services:
  zap2:
    dns:
      - 8.8.8.8
      - 8.8.4.4
```

**Fix (VPS):** Check the system DNS configuration:

```bash
cat /etc/resolv.conf
# Should contain valid nameservers like:
# nameserver 8.8.8.8

# Restart DNS resolver if using systemd-resolved
sudo systemctl restart systemd-resolved
```

---

### 41. ECONNREFUSED

```
connect ECONNREFUSED 142.250.x.x:443
```
```
connect ECONNREFUSED 127.0.0.1:443
```

**Cause:** The TCP connection was actively refused by the target server. This means the server is reachable but not accepting connections on that port, or a firewall is blocking the connection.

**Fix:**
1. If connecting to Google/Buffer APIs, check if a firewall or security group is blocking outbound HTTPS (port 443).
2. If the error shows `127.0.0.1`, there may be a proxy misconfiguration routing external traffic to localhost.
3. Check if `HTTP_PROXY` or `HTTPS_PROXY` environment variables are set incorrectly:

```bash
echo $HTTP_PROXY
echo $HTTPS_PROXY
# Unset if they point to a non-running proxy
unset HTTP_PROXY
unset HTTPS_PROXY
```

---

### 42. ECONNRESET / socket hang up

```
read ECONNRESET
```
```
socket hang up
```

**Cause:** The connection was unexpectedly closed by the remote server during a request. This is typically a transient network issue or the API server terminated the connection.

**Fix:** This is usually transient and the application will retry automatically (Buffer API retries up to 3 times). If persistent:
1. Check if there is a proxy between your server and the internet that has aggressive timeout settings.
2. Verify your VPS/cloud provider is not throttling connections.
3. Check the application logs for the specific endpoint that failed.

---

### 43. ETIMEDOUT

```
connect ETIMEDOUT 172.217.x.x:443
```

**Cause:** The TCP connection attempt timed out before the remote server responded. This indicates severe network issues or the remote server being unreachable.

**Fix:**
1. Verify basic network connectivity: `ping google.com`
2. Check if outbound port 443 is blocked by a firewall.
3. For Docker deployments, ensure the container has network access:

```bash
# Test from inside the container
docker exec <container> wget -q --spider https://sheets.googleapis.com
```

---

### 44. CERT_HAS_EXPIRED / unable to verify certificate

```
CERT_HAS_EXPIRED
```
```
unable to verify the first certificate
```

**Cause:** TLS certificate validation failed. This can happen when:
- The system clock is significantly wrong (certificates have validity periods)
- A corporate proxy is intercepting HTTPS with an untrusted certificate
- The system CA certificates are outdated

**Fix:**
1. Check the system clock: `date` - ensure it is correct
2. If behind a corporate proxy, add the proxy CA certificate to the trusted store
3. Update CA certificates:

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y ca-certificates
sudo update-ca-certificates

# Docker - ensure base image is up to date
docker pull node:20-alpine
```

Do NOT set `NODE_TLS_REJECT_UNAUTHORIZED=0` in production as it disables all certificate validation.

---

## Quick Reference

| Error Pattern | Section |
|---|---|
| `Configuration invalid` | [Configuration Errors](#configuration-errors) |
| `invalid_grant` | [Google Sheets API Errors](#google-sheets-api-errors) |
| `not authenticated` | [Google Sheets API Errors](#google-sheets-api-errors) |
| `Worksheet "X" not found` | [Google Sheets API Errors](#google-sheets-api-errors) |
| `Unknown Buffer API error` | [Buffer API Errors](#buffer-api-errors) |
| `operation was aborted` | [Buffer API Errors](#buffer-api-errors) |
| `retry attempts exhausted` | [Buffer API Errors](#buffer-api-errors) |
| `Failed to save workflows` | [Workflow Management Errors](#workflow-management-errors) |
| `Workflow not found` | [Workflow Management Errors](#workflow-management-errors) |
| `Invalid password` | [Dashboard Errors](#dashboard-errors) |
| `Unauthorized` | [Dashboard Errors](#dashboard-errors) |
| `EROFS` | [System and Docker Errors](#system-and-docker-errors) |
| `ENOENT` | [System and Docker Errors](#system-and-docker-errors) |
| `EADDRINUSE` | [System and Docker Errors](#system-and-docker-errors) |
| `EACCES` / `EPERM` | [System and Docker Errors](#system-and-docker-errors) |
| `heap out of memory` | [System and Docker Errors](#system-and-docker-errors) |
| `EAI_AGAIN` | [Network Errors](#network-errors) |
| `ECONNREFUSED` | [Network Errors](#network-errors) |
| `ECONNRESET` | [Network Errors](#network-errors) |
| `ETIMEDOUT` | [Network Errors](#network-errors) |
| `CERT_HAS_EXPIRED` | [Network Errors](#network-errors) |
