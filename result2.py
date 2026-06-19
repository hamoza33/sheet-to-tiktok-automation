import paramiko
import json

host = "35.255.81.115"
user = "aichaguimaoune"
password = "Hamza@19951995"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, username=user, password=password, timeout=30)

stdin, stdout, stderr = client.exec_command("cat ~/sheet-to-tiktok-automation/dashboard-activity.json 2>/dev/null", timeout=10)
raw = stdout.read().decode()

try:
    data = json.loads(raw)
    activities = data.get("activities", [])
    print(f"Total activities: {len(activities)}")
    for a in activities[:3]:
        print(f"\n[{a['status']}] Row {a['rowNumber']}")
        print(f"  Details: {a['details'][:300]}")
except Exception as e:
    print(f"Parse error: {e}")
    print(raw[:500])

client.close()
