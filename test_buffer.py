import paramiko
import time

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

# Update the token and restart
new_token = "mOfbRxXB-2IjvshBwRH2DSRXVrHWnRcS4SO2fm-X_rB"

commands = [
    # Update ecosystem config with corrected token
    f"""cd ~/sheet-to-tiktok-automation && sed -i 's/BUFFER_ACCESS_TOKEN: .*/BUFFER_ACCESS_TOKEN: "{new_token}",/' ecosystem.config.cjs""",
    "cat ~/sheet-to-tiktok-automation/ecosystem.config.cjs | grep BUFFER_ACCESS",
    # Also clear processed rows so it retries row 2
    "rm -f ~/sheet-to-tiktok-automation/processed-rows.json",
    # Restart
    "cd ~/sheet-to-tiktok-automation && pm2 restart sheet-to-tiktok --update-env",
]

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)
print("Connected!\n")

for cmd in commands:
    print(f">>> {cmd[:80]}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=30)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out.strip():
        print(f"  {out.strip()}")
    if err.strip() and 'From https' not in err:
        print(f"  ERR: {err.strip()[:200]}")
    print()

# Wait for poll cycle
print("Waiting 70 seconds for poll cycle...")
time.sleep(70)

# Check results
stdin, stdout, stderr = client.exec_command("pm2 logs sheet-to-tiktok --lines 10 --nostream", timeout=15)
print("\n>>> LOGS AFTER POLL:")
print(stdout.read().decode().strip())

client.close()
print("\n=== DONE ===")
