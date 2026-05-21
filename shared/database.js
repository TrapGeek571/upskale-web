const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const dbPath = path.join(__dirname, "..", "data", "upskale.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open Upskale database:", err);
    throw err;
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS payments (
      id TEXT PRIMARY KEY,
      phone TEXT,
      amount INTEGER,
      status TEXT,
      createdAt TEXT,
      completedAt TEXT,
      receipt TEXT,
      callbackData TEXT,
      zoomLink TEXT,
      zoomMeetingId TEXT,
      zoomTopic TEXT,
      sessionStart TEXT,
      sessionEnd TEXT,
      consultantId TEXT,
      consultantName TEXT
    )
  `);

  db.all(`PRAGMA table_info(payments)`, (err, rows) => {
    if (err) {
      console.error("Failed to inspect payments table:", err);
      return;
    }

    const columns = new Set(rows.map((row) => row.name));
    const missingColumns = [];

    if (!columns.has("consultantId")) {
      missingColumns.push("ALTER TABLE payments ADD COLUMN consultantId TEXT");
    }
    if (!columns.has("consultantName")) {
      missingColumns.push(
        "ALTER TABLE payments ADD COLUMN consultantName TEXT",
      );
    }
    if (!columns.has("notificationLog")) {
      missingColumns.push(
        "ALTER TABLE payments ADD COLUMN notificationLog TEXT",
      );
    }
    if (!columns.has("notificationEmailSent")) {
      missingColumns.push(
        "ALTER TABLE payments ADD COLUMN notificationEmailSent INTEGER DEFAULT 0",
      );
    }
    if (!columns.has("notificationWhatsAppSent")) {
      missingColumns.push(
        "ALTER TABLE payments ADD COLUMN notificationWhatsAppSent INTEGER DEFAULT 0",
      );
    }

    missingColumns.forEach((sql) => {
      db.run(sql, (alterErr) => {
        if (alterErr) {
          console.error("Failed to migrate payments table:", alterErr);
        }
      });
    });
  });
});

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      return resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

module.exports = {
  run,
  get,
  all,
};
