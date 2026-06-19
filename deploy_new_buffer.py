import paramiko
import time

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

new_token = "6n8w1yrLF-B5Nvk309uXO4-BP1TGwVInpC5iIuIEIFF"
new_channel = "69b767167be9f8b1715dca63"

commands = [
    # Update ecosystem config with new Buffer credentials
    f"""cat > ~/sheet-to-tiktok-automation/ecosystem.config.cjs << 'EOF'
module.exports = {{
  apps: [{{
    name: "sheet-to-tiktok",
    script: "dist/index.js",
    cwd: "/home/aichaguimaoune/sheet-to-tiktok-automation",
    env: {{
      SHEET_ID: "19xNwnl0k-jOqbR08NGqKziyiNV2K3_4X5Hw7nb0ULc0",
      WORKSHEET_NAME: "TikTok",
      GOOGLE_CREDENTIALS_PATH: "/home/aichaguimaoune/sheet-to-tiktok-automation/credentials/service-account.json",
      BUFFER_ACCESS_TOKEN: "{new_token}",
      BUFFER_TIKTOK_PROFILE_ID: "{new_channel}",
      POLLING_INTERVAL_SECONDS: "60",
      HEALTH_CHECK_PORT: "3000"
    }}
  }}]
}}
EOF""",
    # Pull latest code (with shareNow fix)
    "cd ~/sheet-to-tiktok-automation && git pull origin main",
    "cd ~/sheet-to-tiktok-automation && npm run build",
    # Clear processed rows and restart
    "rm -f ~/sheet-to-tiktok-automation/processed-rows.json",
    "rm -f ~/sheet-to-tiktok-automation/dashboard-activity.json",
    "cd ~/sheet-to-tiktok-automation && pm2 delete sheet-to-tiktok 2>/dev/null; pm2 start ecosystem.config.cjs",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)
print("Connected!\n")

for cmd in commands:
    print(f">>> {cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(f"  {out.strip()[:200]}")
    print()

# Wait for poll cycle
print("Waiting 70s for poll cycle...")
time.sleep(70)

# Check results
stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 10 --nostream", timeout=15)
logs = stdout.read().decode().strip()
print("\n>>> LOGS:")
print(logs)

if "Successfully scheduled post" in logs:
    print("\n🎉 SUCCESS! Post was scheduled via Buffer!")
elif "Failed to schedule post" in logs:
    # Extract the error
    for line in logs.split('\n'):
        if 'Failed to schedule' in line:
            print(f"\n❌ Error: {line[line.find('error'):][:200]}")
            break
elif "processedRows\":1" in logs:
    print("\n✅ Row processed!")
else:
    print("\n⏳ Waiting for result...")

client.close()
