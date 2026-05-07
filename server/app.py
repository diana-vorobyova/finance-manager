import sqlite3
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

DATABASE = "finance.db"


def get_db_connection():
    conn = sqlite3.connect(DATABASE, timeout=10)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS operations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            amount REAL NOT NULL,
            type TEXT NOT NULL,
            category TEXT NOT NULL,
            date TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS budgets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            category TEXT NOT NULL,
            limit_amount REAL NOT NULL,
            UNIQUE(user_id, category),
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    """)

    conn.commit()
    conn.close()


def create_default_budgets_for_user(user_id):
    default_budgets = [
        ("продукти", 5000),
        ("транспорт", 2000),
        ("розваги", 3000),
        ("комунальні послуги", 4000),
        ("здоров'я", 1500),
    ]

    conn = get_db_connection()
    cursor = conn.cursor()

    for category, limit_amount in default_budgets:
        cursor.execute("""
            INSERT OR IGNORE INTO budgets (user_id, category, limit_amount)
            VALUES (?, ?, ?)
        """, (user_id, category, limit_amount))

    conn.commit()
    conn.close()


@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Сервер працює"}), 200


@app.route("/register", methods=["POST"])
def register():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Дані не передані"}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"message": "Заповни всі поля"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    existing_user = cursor.execute(
        "SELECT id FROM users WHERE username = ?",
        (username,)
    ).fetchone()

    if existing_user:
        conn.close()
        return jsonify({"message": "Користувач уже існує"}), 400

    cursor.execute(
        "INSERT INTO users (username, password) VALUES (?, ?)",
        (username, password)
    )

    user_id = cursor.lastrowid
    conn.commit()
    conn.close()

    create_default_budgets_for_user(user_id)

    return jsonify({"message": "Реєстрація успішна"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Дані не передані"}), 400

    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not username or not password:
        return jsonify({"message": "Заповни всі поля"}), 400

    conn = get_db_connection()
    user = conn.execute(
        "SELECT id, username FROM users WHERE username = ? AND password = ?",
        (username, password)
    ).fetchone()
    conn.close()

    if not user:
        return jsonify({"message": "Невірний логін або пароль"}), 401

    create_default_budgets_for_user(user["id"])

    return jsonify({
        "message": "Вхід успішний",
        "user_id": user["id"],
        "username": user["username"]
    }), 200


@app.route("/operations/<int:user_id>", methods=["GET"])
def get_operations(user_id):
    conn = get_db_connection()
    operations = conn.execute(
        "SELECT * FROM operations WHERE user_id = ? ORDER BY id DESC",
        (user_id,)
    ).fetchall()
    conn.close()

    return jsonify([dict(row) for row in operations]), 200


@app.route("/operations", methods=["POST"])
def add_operation():
    data = request.get_json()

    if not data:
        return jsonify({"message": "Дані не передані"}), 400

    user_id = data.get("user_id")
    name = str(data.get("name", "")).strip()
    amount = data.get("amount")
    operation_type = str(data.get("type", "")).strip()
    category = str(data.get("category", "")).strip()
    date = str(data.get("date", "")).strip()

    if not user_id or not name or amount is None or not operation_type or not category or not date:
        return jsonify({"message": "Заповни всі поля"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO operations (user_id, name, amount, type, category, date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (user_id, name, amount, operation_type, category, date))

    conn.commit()
    new_id = cursor.lastrowid
    conn.close()

    return jsonify({
        "id": new_id,
        "user_id": user_id,
        "name": name,
        "amount": amount,
        "type": operation_type,
        "category": category,
        "date": date
    }), 201


@app.route("/operations/<int:operation_id>", methods=["PUT"])
def update_operation(operation_id):
    data = request.get_json()

    if not data:
        return jsonify({"message": "Дані не передані"}), 400

    user_id = data.get("user_id")
    name = str(data.get("name", "")).strip()
    amount = data.get("amount")
    operation_type = str(data.get("type", "")).strip()
    category = str(data.get("category", "")).strip()
    date = str(data.get("date", "")).strip()

    if not user_id or not name or amount is None or not operation_type or not category or not date:
        return jsonify({"message": "Заповни всі поля"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE operations
        SET name = ?, amount = ?, type = ?, category = ?, date = ?
        WHERE id = ? AND user_id = ?
    """, (name, amount, operation_type, category, date, operation_id, user_id))

    conn.commit()
    updated_rows = cursor.rowcount
    conn.close()

    if updated_rows == 0:
        return jsonify({"message": "Операцію не знайдено"}), 404

    return jsonify({"message": "Операцію оновлено"}), 200


@app.route("/operations/<int:operation_id>/<int:user_id>", methods=["DELETE"])
def delete_operation(operation_id, user_id):
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute(
        "DELETE FROM operations WHERE id = ? AND user_id = ?",
        (operation_id, user_id)
    )

    conn.commit()
    deleted_rows = cursor.rowcount
    conn.close()

    if deleted_rows == 0:
        return jsonify({"message": "Операцію не знайдено"}), 404

    return jsonify({"message": "Операцію видалено"}), 200


@app.route("/budgets/<int:user_id>", methods=["GET"])
def get_budgets(user_id):
    create_default_budgets_for_user(user_id)

    conn = get_db_connection()
    budgets = conn.execute(
        "SELECT * FROM budgets WHERE user_id = ? ORDER BY category",
        (user_id,)
    ).fetchall()
    conn.close()

    return jsonify([dict(row) for row in budgets]), 200


@app.route("/budgets/<int:budget_id>", methods=["PUT"])
def update_budget(budget_id):
    data = request.get_json()

    if not data:
        return jsonify({"message": "Дані не передані"}), 400

    user_id = data.get("user_id")
    limit_amount = data.get("limit_amount")

    if not user_id or limit_amount is None:
        return jsonify({"message": "Недостатньо даних"}), 400

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        UPDATE budgets
        SET limit_amount = ?
        WHERE id = ? AND user_id = ?
    """, (limit_amount, budget_id, user_id))

    conn.commit()
    updated_rows = cursor.rowcount
    conn.close()

    if updated_rows == 0:
        return jsonify({"message": "Бюджет не знайдено"}), 404

    return jsonify({"message": "Бюджет оновлено"}), 200


init_db()

if name == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)