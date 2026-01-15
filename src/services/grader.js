const { ServerManager } = require("../utils/server")
const { APITester } = require("../tests/api.test")
const fs = require("fs")
const path = require("path")

class Grader {
	constructor(baseUrl = "http://localhost:3000", timeout = 30000) {
		this.baseUrl = baseUrl
		this.timeout = timeout
	}

	/**
	 * Grade a single student's submission
	 * @param {Object} student - Student object with name, id, and repoPath
	 * @returns {Promise<Object>} Grading result
	 */
	async gradeStudent(student) {
		console.log("\n" + "=".repeat(60))
		console.log(`📝 Grading: ${student.studentName} (${student.studentId})`)
		console.log("=".repeat(60))

		const result = {
			student: {
				studentId: student.studentId,
				studentName: student.studentName,
				repoPath: student.repoPath,
				githubUrl: student.githubUrl,
			},
			totalScore: 0,
			maxScore: 100,
			percentage: 0,
			tests: [],
			serverStarted: false,
			timestamp: new Date().toISOString(),
			errors: [],
		}

		// Check if repo exists
		if (!fs.existsSync(student.repoPath)) {
			console.error(`❌ Repository not found: ${student.repoPath}`)
			result.errors.push("Repository not found")
			return result
		}

		// Check if backend folder exists
		const backendPath = path.join(student.repoPath, "backend")
		if (!fs.existsSync(backendPath)) {
			console.error(`❌ Backend folder not found in repository`)
			result.errors.push("Backend folder not found")
			return result
		}

		// Check if package.json exists
		const packageJsonPath = path.join(backendPath, "package.json")
		if (!fs.existsSync(packageJsonPath)) {
			console.error(`❌ package.json not found in backend folder`)
			result.errors.push("package.json not found")
			return result
		}

		const serverManager = new ServerManager(this.baseUrl, this.timeout)
		const apiTester = new APITester(this.baseUrl)

		try {
			// Step 1: Start the server
			console.log("\n🚀 Starting server...")
			result.serverStarted = await serverManager.startServer(student.repoPath)

			if (!result.serverStarted) {
				console.error("❌ Server failed to start")
				result.errors.push("Server failed to start")
				result.tests.push({
					testName: "Server Startup",
					passed: false,
					points: 0,
					maxPoints: 5,
					details: "✗ Le serveur n'a pas démarré",
				})
				return result
			}

			console.log("✅ Server started successfully")
			result.tests.push({
				testName: "Server Startup",
				passed: true,
				points: 5,
				maxPoints: 5,
				details: "✓ Le serveur a démarré correctement",
			})

			// Step 2: Wait a bit for server to stabilize
			await new Promise((resolve) => setTimeout(resolve, 2000))

			// Step 3: Run API tests
			console.log("\n🧪 Running API tests...")
			const testResults = await apiTester.runAllTests()
			result.tests.push(...testResults)

			// Step 4: Calculate total score
			result.totalScore = result.tests.reduce(
				(sum, test) => sum + test.points,
				0
			)
			result.percentage = ((result.totalScore / result.maxScore) * 100).toFixed(
				2
			)

			console.log("\n📊 Results:")
			console.log(
				`Total Score: ${result.totalScore}/${result.maxScore} (${result.percentage}%)`
			)
		} catch (error) {
			console.error("❌ Error during grading:", error.message)
			result.errors.push(error.message)
		} finally {
			// Always stop the server
			console.log("\n🛑 Stopping server...")
			await serverManager.stopServer()
			console.log("✅ Server stopped")
		}

		return result
	}

	/**
	 * Grade multiple students
	 * @param {Array} students - Array of student objects
	 * @returns {Promise<Array>} Array of grading results
	 */
	async gradeMultipleStudents(students) {
		const results = []

		console.log(`\n📚 Starting to grade ${students.length} students...\n`)

		for (let i = 0; i < students.length; i++) {
			const student = students[i]
			console.log(
				`\n[${i + 1}/${students.length}] Processing ${student.studentName}...`
			)

			try {
				const result = await this.gradeStudent(student)
				results.push(result)

				// Wait a bit between students to ensure clean shutdown
				if (i < students.length - 1) {
					console.log("\n⏳ Waiting before next student...")
					await new Promise((resolve) => setTimeout(resolve, 3000))
				}
			} catch (error) {
				console.error(
					`❌ Failed to grade ${student.studentName}:`,
					error.message
				)
				results.push({
					student: {
						studentId: student.studentId,
						studentName: student.studentName,
						repoPath: student.repoPath,
						githubUrl: student.githubUrl,
					},
					totalScore: 0,
					maxScore: 100,
					percentage: 0,
					tests: [],
					serverStarted: false,
					timestamp: new Date().toISOString(),
					errors: [error.message],
				})
			}
		}

		// Summary
		console.log("\n" + "=".repeat(60))
		console.log("📊 GRADING SUMMARY")
		console.log("=".repeat(60))

		const avgScore =
			results.reduce((sum, r) => sum + r.totalScore, 0) / results.length
		const passedCount = results.filter((r) => r.totalScore >= 50).length

		console.log(`Total students graded: ${results.length}`)
		console.log(`Average score: ${avgScore.toFixed(2)}/${results[0].maxScore}`)
		console.log(`Students passed (≥50%): ${passedCount}/${results.length}`)
		console.log("=".repeat(60) + "\n")

		return results
	}

	/**
	 * Get summary statistics from results
	 * @param {Array} results - Array of grading results
	 * @returns {Object} Summary statistics
	 */
	getSummaryStats(results) {
		const scores = results.map((r) => r.totalScore)
		const percentages = results.map((r) => parseFloat(r.percentage))

		return {
			totalStudents: results.length,
			averageScore: (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(
				2
			),
			averagePercentage: (
				percentages.reduce((a, b) => a + b, 0) / percentages.length
			).toFixed(2),
			highestScore: Math.max(...scores),
			lowestScore: Math.min(...scores),
			passedCount: results.filter((r) => r.totalScore >= 50).length,
			failedCount: results.filter((r) => r.totalScore < 50).length,
			perfectScores: results.filter((r) => r.totalScore === 100).length,
			serverStartFailures: results.filter((r) => !r.serverStarted).length,
		}
	}
}

module.exports = { Grader }
