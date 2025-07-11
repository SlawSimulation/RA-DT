import json, os, pathlib, datetime, requests, sys

# Paths
ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
USERS_FILE = DATA / "users.json"
STATE_FILE = DATA / "last_polled.json"

# Load users list safely
try:
    USERS = json.loads(USERS_FILE.read_text())
except (FileNotFoundError, json.JSONDecodeError):
    USERS = []

# Load previous state (timestamp of last check per user)
state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}

# Discord webhook
WEBHOOK = os.getenv("DISCORD_WEBHOOK")
if not WEBHOOK:
    sys.exit("❌ DISCORD_WEBHOOK not set in environment variables.")

# Get recent achievements from RA API
def fetch_recent(user):
    base = "https://retroachievements.org/API/API_GetUserRecentAchievements.php"
    params = {
        "u": user["username"],
        "y": user["api_key"],
        "m": 60  # Look back 60 minutes
    }
    r = requests.get(base, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

# Send Discord embed
def post(embed):
    requests.post(WEBHOOK, json={"embeds": [embed]}, timeout=10)

# New polling state to be written after processing
new_state = {}

# Main processing loop
for u in USERS:
    last_check = state.get(u["username"], "1970-01-01 00:00:00")
    last_dt = datetime.datetime.strptime(last_check, "%Y-%m-%d %H:%M:%S")

    try:
        achievements = fetch_recent(u)
    except Exception as e:
        print(f"⚠️ Failed to fetch for {u['username']}: {e}")
        continue

    for a in achievements:
        unlocked = datetime.datetime.strptime(a["Date"], "%Y-%m-%d %H:%M:%S")
        if unlocked <= last_dt:
            continue  # already posted

        embed = {
            "author": {"name": u["username"]},
            "title": a["Title"],
            "description": a["Description"],
            "url": f'https://retroachievements.org/achievement/{a["AchievementID"]}',
            "thumbnail": {"url": f'https://retroachievements.org{a["BadgeURL"]}'},
            "fields": [
                {"name": "Game", "value": a["GameTitle"], "inline": True},
                {"name": "Points", "value": str(a["Points"]), "inline": True},
            ],
            "timestamp": unlocked.isoformat(),
            "color": 0x7289da  # Discord blurple
        }
        post(embed)

    # Update polling timestamp per user
    new_state[u["username"]] = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

# Save updated state
STATE_FILE.write_text(json.dumps(new_state, indent=2))
