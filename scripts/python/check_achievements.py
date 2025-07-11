import json, os, pathlib, datetime, requests, sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
DATA = ROOT / "data"
USERS = json.loads((DATA / "users.json").read_text())
STATE_FILE = DATA / "last_polled.json"
state = json.loads(STATE_FILE.read_text()) if STATE_FILE.exists() else {}

WEBHOOK = os.getenv("DISCORD_WEBHOOK")
if not WEBHOOK:
    sys.exit("DISCORD_WEBHOOK not set")

def fetch_recent(user):
    base = "https://retroachievements.org/API/API_GetUserRecentAchievements.php"
    params = {
        "u": user["username"],
        "y": user["api_key"],
        "m": 60  # look back 60 min; the Action runs every 5
    }
    r = requests.get(base, params=params, timeout=20)
    r.raise_for_status()
    return r.json()

def post(embed):
    requests.post(WEBHOOK, json={"embeds": [embed]}, timeout=10)

new_state = {}
for u in USERS:
    last_check = state.get(u["username"], "1970-01-01 00:00:00")
    last_dt = datetime.datetime.strptime(last_check, "%Y-%m-%d %H:%M:%S")
    for a in fetch_recent(u):
        unlocked = datetime.datetime.strptime(a["Date"], "%Y-%m-%d %H:%M:%S")
        if unlocked <= last_dt:           # already announced
            continue

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
        }
        post(embed)

    # newest achievement time becomes the next baseline
    new_state[u["username"]] = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

STATE_FILE.write_text(json.dumps(new_state, indent=2))

