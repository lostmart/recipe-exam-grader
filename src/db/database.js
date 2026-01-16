const Database = require("better-sqlite3")
const path = require("path")
const fs = require("fs")

// Create db folder if it doesn't exist
const dbDir = path.join(__dirname, "../../db")
if (!fs.existsSync(dbDir)) {
	fs.mkdirSync(dbDir, { recursive: true })
}

const db = new Database(path.join(dbDir, "exam-results.db"))

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_url TEXT UNIQUE NOT NULL,
    repo_name TEXT NOT NULL,
    tested_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER NOT NULL,
    backend_score INTEGER NOT NULL,
    backend_total INTEGER NOT NULL,
    frontend_score INTEGER NOT NULL,
    frontend_total INTEGER NOT NULL,
    total_score INTEGER NOT NULL,
    total_possible INTEGER NOT NULL,
    percentage REAL NOT NULL,
    grade TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id)
  );

  CREATE TABLE IF NOT EXISTS test_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    result_id INTEGER NOT NULL,
    test_type TEXT NOT NULL,
    test_name TEXT NOT NULL,
    passed INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (result_id) REFERENCES results(id)
  );
`)

function saveResults(repoUrl, repoName, backendResults, frontendResults) {
	const backendScore = backendResults.passed
	const backendTotal = backendResults.total
	const frontendScore = frontendResults.passed
	const frontendTotal = frontendResults.total
	const totalScore = backendScore + frontendScore
	const totalPossible = backendTotal + frontendTotal
	const percentage = ((totalScore / totalPossible) * 100).toFixed(1)

	// Calculate grade
	let grade = ""
	if (percentage >= 90) grade = "A"
	else if (percentage >= 80) grade = "B"
	else if (percentage >= 70) grade = "C"
	else if (percentage >= 60) grade = "D"
	else grade = "F"

	// Insert or update student
	const insertStudent = db.prepare(`
    INSERT INTO students (repo_url, repo_name, tested_at) 
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(repo_url) DO UPDATE SET tested_at = CURRENT_TIMESTAMP
  `)

	insertStudent.run(repoUrl, repoName)

	const student = db
		.prepare("SELECT id FROM students WHERE repo_url = ?")
		.get(repoUrl)

	// Insert result
	const insertResult = db.prepare(`
    INSERT INTO results (
      student_id, backend_score, backend_total, 
      frontend_score, frontend_total, 
      total_score, total_possible, percentage, grade
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)

	const result = insertResult.run(
		student.id,
		backendScore,
		backendTotal,
		frontendScore,
		frontendTotal,
		totalScore,
		totalPossible,
		percentage,
		grade
	)

	const resultId = result.lastInsertRowid

	// Insert test details
	const insertTest = db.prepare(`
    INSERT INTO test_details (result_id, test_type, test_name, passed)
    VALUES (?, ?, ?, ?)
  `)

	// Backend tests
	backendResults.tests.forEach((test) => {
		insertTest.run(resultId, "backend", test.name, test.passed ? 1 : 0)
	})

	// Frontend tests
	frontendResults.tests.forEach((test) => {
		insertTest.run(resultId, "frontend", test.name, test.passed ? 1 : 0)
	})

	console.log("\n✅ Results saved to database!")
	return resultId
}

function getAllResults() {
	return db
		.prepare(
			`
    SELECT 
      s.repo_name,
      s.repo_url,
      r.backend_score,
      r.backend_total,
      r.frontend_score,
      r.frontend_total,
      r.total_score,
      r.total_possible,
      r.percentage,
      r.grade,
      r.created_at
    FROM results r
    JOIN students s ON r.student_id = s.id
    ORDER BY r.created_at DESC
  `
		)
		.all()
}

function getResultById(resultId) {
	const result = db
		.prepare(
			`
    SELECT 
      s.repo_name,
      s.repo_url,
      r.*
    FROM results r
    JOIN students s ON r.student_id = s.id
    WHERE r.id = ?
  `
		)
		.get(resultId)

	if (!result) return null

	const tests = db
		.prepare(
			`
    SELECT test_type, test_name, passed
    FROM test_details
    WHERE result_id = ?
  `
		)
		.all(resultId)

	return { ...result, tests }
}

module.exports = {
	saveResults,
	getAllResults,
	getResultById,
	db,
}
