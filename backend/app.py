
import os

from dotenv import load_dotenv
from flask import Flask, jsonify, request
from flask_cors import CORS
from supabase import create_client

load_dotenv()

app = Flask(__name__)

frontend_origin = os.getenv(
    "FRONTEND_ORIGIN",
    "http://127.0.0.1:5500"
)

CORS(app, origins=[
    frontend_origin,
    "http://localhost:5500"
])

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

db = None

if SUPABASE_URL and SUPABASE_KEY:
    db = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_database():
    if db is None:
        return None
    return db


@app.route("/", methods=["GET"])
def home():
    return jsonify({
        "message": "CampusFix API is running!",
        "status": "online"
    })


@app.route("/api/complaints", methods=["GET"])
def get_complaints():
    database = get_database()

    if database is None:
        return jsonify({
            "error": "Supabase environment variables are missing."
        }), 503

    try:
        result = (
            database.table("complaints")
            .select("*")
            .order("created_at", desc=True)
            .execute()
        )

        return jsonify(result.data), 200

    except Exception as error:
        app.logger.exception("Could not fetch complaints")
        return jsonify({
            "error": "Could not load complaints."
        }), 500


@app.route("/api/complaints", methods=["POST"])
def create_complaint():
    database = get_database()

    if database is None:
        return jsonify({
            "error": "Supabase environment variables are missing."
        }), 503

    data = request.get_json(silent=True) or {}

    title = str(data.get("title", "")).strip()
    category = str(data.get("category", "")).strip()
    location = str(data.get("location", "")).strip()
    description = str(data.get("description", "")).strip()

    allowed_categories = {
        "Infrastructure",
        "Cleanliness",
        "Electrical",
        "Water Supply",
        "Internet",
        "Other"
    }

    if not title or len(title) > 120:
        return jsonify({
            "error": "Title must contain 1–120 characters."
        }), 400

    if category not in allowed_categories:
        return jsonify({
            "error": "Please select a valid category."
        }), 400

    if not location or len(location) > 120:
        return jsonify({
            "error": "Location must contain 1–120 characters."
        }), 400

    if not description or len(description) > 1000:
        return jsonify({
            "error": "Description must contain 1–1000 characters."
        }), 400

    try:
        result = (
            database.table("complaints")
            .insert({
                "title": title,
                "category": category,
                "location": location,
                "description": description,
                "status": "Pending"
            })
            .execute()
        )

        if not result.data:
            return jsonify({
                "error": "Complaint could not be created."
            }), 500

        return jsonify(result.data[0]), 201

    except Exception:
        app.logger.exception("Could not create complaint")
        return jsonify({
            "error": "Could not save complaint."
        }), 500


@app.route("/api/complaints/<int:complaint_id>", methods=["DELETE"])
def delete_complaint(complaint_id):
    database = get_database()

    if database is None:
        return jsonify({
            "error": "Supabase environment variables are missing."
        }), 503

    try:
        result = (
            database.table("complaints")
            .delete()
            .eq("id", complaint_id)
            .execute()
        )

        if not result.data:
            return jsonify({
                "error": "Complaint not found."
            }), 404

        return jsonify({
            "message": "Complaint deleted successfully."
        }), 200

    except Exception:
        app.logger.exception("Could not delete complaint")
        return jsonify({
            "error": "Could not delete complaint."
        }), 500


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
