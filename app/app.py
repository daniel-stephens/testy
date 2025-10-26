from flask import Flask, render_template, jsonify, request, current_app
import json
from pathlib import Path

app = Flask(__name__, template_folder="templates", static_folder="static")

@app.route("/")
def index():
    return render_template("dashboard.html", modelname="modelName", model_id="model_id")

@app.route("/get-dashboard-data", methods=["GET"])
def get_data():
    data_path = Path(app.static_folder) / "data" / "dashboardData.json"
    try:
        with data_path.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        return jsonify(payload), 200
    except FileNotFoundError:
        app.logger.error("Missing %s", data_path)
        return jsonify({"error": "dashboardData.json not found"}), 404
    except Exception as e:
        app.logger.exception("Failed reading %s", data_path)
        return jsonify({"error": "failed to read data"}), 500

@app.post("/save-settings")
def save_settings():
    payload = request.get_json(silent=True) or {}
    app.logger.info("Dummy /save-settings received: %s", payload)
    return jsonify({"ok": True, "echo": payload}), 200
