from flask import Flask, render_template, jsonify, request
import json, os
from pathlib import Path

app = Flask(__name__, template_folder="templates", static_folder="static")

# --- HTML page ---
@app.route("/")
def index():
    return render_template("dashboard.html", modelname="modelName", model_id = "model_id")
\

@app.route("/get-dashboard-data", methods=["GET", "POST"])
def get_data():
    data_path = Path("./static/data/dashboardData.json")
    # Read the JSON file from disk and return it
    with data_path.open("r", encoding="utf-8") as f:
        payload = json.load(f)
    # jsonify sets the correct Content-Type and handles UTF-8 safely
    return jsonify(payload)



@app.post("/save-settings")
def save_settings():
    payload = request.get_json(silent=True) or {}
    app.logger.info("Dummy /save-settings received: %s", payload)
    return jsonify({"ok": True, "echo": payload}), 200






if __name__ == "__main__":
    app.run(debug=True)
