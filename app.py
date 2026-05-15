"""
Applied Computing 1&2 - 1.2 Programming
Jeremy Fernando
Basketball Scoreboard Web App
Flask Server - app.py
"""

from flask import Flask, render_template, request, redirect, url_for, session, jsonify
from os import system
import json
import os

app = Flask(__name__)
app.secret_key = "scoreboard_secret_key_2026"

# In-memmory game state (resets on refresh )
#note to self -- all functions back to state
game_state = {
    "team1": {
        "name": "Team Alpha",
        "score": 0,
        "fouls": 0,
        "timeouts": 3,
   
     "color": "#e74c3c",
        "players": []
    },
    "team2": {
        "name": "Team Beta",
        "score": 0,
        "fouls": 0,
        "timeouts": 3,
        "color": "#3498db",
        "players": []
    },
    "quarter": 1,
    "time_remaining": "10:00",
    "game_active": False,
    "game_over": False,
    "period_label": "Q1"
}

#Admin Login 
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "password123"



# Login Helper

def is_logged_in():
    return session.get("logged_in", False)

# Login/Scoreboard Routes

@app.route("/")
def index():
    """Redirect to login or scoreboard."""
    if is_logged_in():
        return redirect(url_for("admin"))
    return redirect(url_for("login"))


#login Instruction to match Password
@app.route("/login", methods=["GET", "POST"])
def login():
    """Login page."""
    error = None
    if request.method == "POST":
        username = request.form.get("username", "")
        password = request.form.get("password", "")
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session["logged_in"] = True
            return redirect(url_for("admin"))
        else:
            error = "Invalid username or password."
    return render_template("login.html", error=error)

#logout Function
@app.route("/logout")
def logout():
    """Log out and return to login."""
    session.clear()
    return redirect(url_for("login"))

#live scoreboard view
@app.route("/scoreboard")
def scoreboard():
    """Public live scoreboard view (no login required)."""
    return render_template("scoreboard.html", game=game_state)

#login page
@app.route("/admin")
def admin():
    """Admin control panel (login required)."""
    if not is_logged_in():
        return redirect(url_for("login"))
    return render_template("admin.html", game=game_state)

#settings page onboarding
@app.route("/setup", methods=["GET", "POST"])
def setup():
    """Game setup page (login required)."""
    if not is_logged_in():
        return redirect(url_for("login"))
    if request.method == "POST":
        game_state["team1"]["name"] = request.form.get("team1_name", "Team Alpha")
        game_state["team1"]["color"] = request.form.get("team1_color", "#e74c3c")
        game_state["team2"]["name"] = request.form.get("team2_name", "Team Beta")
        game_state["team2"]["color"] = request.form.get("team2_color", "#3498db")

        # Parse players for team 1
        team1_players = []
        for i in range(1, 6):
            name = request.form.get(f"team1_player{i}", "").strip()
            number = request.form.get(f"team1_number{i}", "").strip()
            if name:
                team1_players.append({"name": name, "number": number, "points": 0, "fouls": 0})
        game_state["team1"]["players"] = team1_players

        # Parse players for team 2
        team2_players = []
        for i in range(1, 6):
            name = request.form.get(f"team2_player{i}", "").strip()
            number = request.form.get(f"team2_number{i}", "").strip()
            if name:
                team2_players.append({"name": name, "number": number, "points": 0, "fouls": 0})
        game_state["team2"]["players"] = team2_players

        # Reset scores
        game_state["team1"]["score"] = 0
        game_state["team1"]["fouls"] = 0
        game_state["team1"]["timeouts"] = 3
        game_state["team2"]["score"] = 0
        game_state["team2"]["fouls"] = 0
        game_state["team2"]["timeouts"] = 3
        game_state["quarter"] = 1
        game_state["period_label"] = "Q1"
        game_state["time_remaining"] = "10:00"
        game_state["game_active"] = False
        game_state["game_over"] = False

        return redirect(url_for("admin"))
    return render_template("setup.html", game=game_state)

# API Endpoints (used by JS fetch calls)
@app.route("/api/state")
def api_state():
    """Return current game state as JSON."""
    return jsonify(game_state)

#Point score
@app.route("/api/score", methods=["POST"])
def api_score():
    """Add points to a team."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    team = data.get("team")
    points = int(data.get("points", 1))
    if team == "team1":
        game_state["team1"]["score"] = max(0, game_state["team1"]["score"] + points)
    elif team == "team2":
        game_state["team2"]["score"] = max(0, game_state["team2"]["score"] + points)
    return jsonify(game_state)

#Foul counter
@app.route("/api/foul", methods=["POST"])
def api_foul():
    """Add or remove a foul for a team."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    team = data.get("team")
    action = data.get("action", "add")  # "add" or "remove"
    delta = 1 if action == "add" else -1
    if team == "team1":
        game_state["team1"]["fouls"] = max(0, game_state["team1"]["fouls"] + delta)
    elif team == "team2":
        game_state["team2"]["fouls"] = max(0, game_state["team2"]["fouls"] + delta)
    return jsonify(game_state)

#timeout method
@app.route("/api/timeout", methods=["POST"])
def api_timeout():
    """Use a timeout for a team."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    team = data.get("team")
    if team == "team1" and game_state["team1"]["timeouts"] > 0:
        game_state["team1"]["timeouts"] -= 1
    elif team == "team2" and game_state["team2"]["timeouts"] > 0:
        game_state["team2"]["timeouts"] -= 1
    return jsonify(game_state)

#loginVerify
@app.route("/api/quarter", methods=["POST"])
def api_quarter():
    """Advance to the next quarter."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    q = game_state["quarter"]
    if q < 4:
        game_state["quarter"] = q + 1
        game_state["period_label"] = f"Q{q + 1}"
        game_state["time_remaining"] = "10:00"
        game_state["game_over"] = False
    else:
        game_state["game_over"] = True
        game_state["period_label"] = "FINAL"
    return jsonify(game_state)

#timer toggle (start / pause)
@app.route("/api/timer", methods=["POST"])
def api_timer():
    """Start or pause the game timer."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    running = bool(data.get("running", False))
    game_state["timer_running"] = running
    game_state["game_active"]   = running
    return jsonify(game_state)

#clock method
@app.route("/api/time", methods=["POST"])
def api_time():
    """Update the clock display."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    game_state["time_remaining"] = data.get("time", "10:00")
    return jsonify(game_state)

#reset function 
@app.route("/api/reset", methods=["POST"])
def api_reset():
    """Full game reset."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    game_state["team1"]["score"] = 0
    game_state["team1"]["fouls"] = 0
    game_state["team1"]["timeouts"] = 3
    game_state["team2"]["score"] = 0
    game_state["team2"]["fouls"] = 0
    game_state["team2"]["timeouts"] = 3
    game_state["quarter"] = 1
    game_state["period_label"] = "Q1"
    game_state["time_remaining"] = "10:00"
    game_state["game_active"] = False
    game_state["game_over"] = False
    for p in game_state["team1"]["players"]:
        p["points"] = 0
        p["fouls"] = 0
    for p in game_state["team2"]["players"]:
        p["points"] = 0
        p["fouls"] = 0
    return jsonify(game_state)

#foul counter
@app.route("/api/player_foul", methods=["POST"])
def api_player_foul():
    """Add a foul to a specific player."""
    if not is_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    data = request.get_json()
    team = data.get("team")
    player_idx = int(data.get("player_index", 0))
    players = game_state[team]["players"]
    if 0 <= player_idx < len(players):
        players[player_idx]["fouls"] = min(6, players[player_idx]["fouls"] + 1)
        game_state[team]["fouls"] = sum(p["fouls"] for p in players)
    return jsonify(game_state)


if __name__ == "__main__":
    app.run(debug=True, port=5000)
