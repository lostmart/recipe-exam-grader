const fs = require("fs")
const path = require("path")

class ReportGenerator {
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

				// Save intermediate results after each student (in case of crash)
				const { ReportGenerator } = require("../utils/report")
				const reportGen = new ReportGenerator()
				const intermediateStats = this.getSummaryStats(results)
				reportGen.saveReport(
					JSON.stringify(results, null, 2),
					"intermediate_results.json",
					"./results"
				)

				// Wait before next student
				if (i < students.length - 1) {
					console.log("\n⏳ Waiting 5 seconds before next student...")
					await new Promise((resolve) => setTimeout(resolve, 5000))
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
	 * Generate a CSV report for all students
	 * @param {Array} results - Array of grading results
	 * @returns {string} CSV formatted report
	 */
	generateCSVReport(results) {
		let csv = "ID,Nom,Score Total,Pourcentage,Serveur Démarré,"

		// Get test names from first result
		if (results.length > 0 && results[0].tests) {
			const testNames = results[0].tests.map((t) => t.testName)
			csv += testNames.join(",")
		}
		csv += ",Erreurs,Repository\n"

		results.forEach((result) => {
			const row = [
				result.student.studentId,
				`"${result.student.studentName}"`,
				result.totalScore,
				result.percentage,
				result.serverStarted ? "Oui" : "Non",
			]

			// Add test scores
			if (result.tests) {
				result.tests.forEach((test) => {
					row.push(test.points)
				})
			}

			// Add errors
			const errors =
				result.errors && result.errors.length > 0
					? `"${result.errors.join("; ")}"`
					: ""
			row.push(errors)

			// Add repository URL
			row.push(result.student.githubUrl || "")

			csv += row.join(",") + "\n"
		})

		return csv
	}

	/**
	 * Generate a JSON report for all students
	 * @param {Array} results - Array of grading results
	 * @param {Object} stats - Summary statistics
	 * @returns {string} JSON formatted report
	 */
	generateJSONReport(results, stats) {
		const report = {
			metadata: {
				generatedAt: new Date().toISOString(),
				totalStudents: results.length,
			},
			statistics: stats,
			results: results,
		}

		return JSON.stringify(report, null, 2)
	}

	/**
	 * Save report to file
	 * @param {string} content - Report content
	 * @param {string} filename - Output filename
	 * @param {string} outputDir - Output directory
	 */
	saveReport(content, filename, outputDir = "./results") {
		// Create output directory if it doesn't exist
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true })
		}

		const filepath = path.join(outputDir, filename)
		fs.writeFileSync(filepath, content, "utf-8")
		console.log(`✅ Report saved: ${filepath}`)

		return filepath
	}

	/**
	 * Generate and save all report formats
	 * @param {Array} results - Array of grading results
	 * @param {Object} stats - Summary statistics
	 * @param {string} outputDir - Output directory
	 * @returns {Object} Paths to generated reports
	 */
	generateAllReports(results, stats, outputDir = "./results") {
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, -5)

		const markdownReport = this.generateMarkdownReport(results, stats)
		const csvReport = this.generateCSVReport(results)
		const jsonReport = this.generateJSONReport(results, stats)

		const markdownPath = this.saveReport(
			markdownReport,
			`rapport_${timestamp}.md`,
			outputDir
		)
		const csvPath = this.saveReport(
			csvReport,
			`resultats_${timestamp}.csv`,
			outputDir
		)
		const jsonPath = this.saveReport(
			jsonReport,
			`resultats_${timestamp}.json`,
			outputDir
		)

		return {
			markdown: markdownPath,
			csv: csvPath,
			json: jsonPath,
		}
	}

	/**
	 * Get emoji based on score percentage
	 * @param {number} percentage
	 * @returns {string}
	 */
	getScoreEmoji(percentage) {
		const score = parseFloat(percentage)
		if (score >= 90) return "🌟"
		if (score >= 80) return "🎉"
		if (score >= 70) return "👍"
		if (score >= 60) return "✔️"
		if (score >= 50) return "📝"
		return "⚠️"
	}

	/**
	 * Print summary to console
	 * @param {Object} stats - Summary statistics
	 */
	printSummary(stats) {
		console.log("\n" + "=".repeat(60))
		console.log("📊 STATISTIQUES FINALES")
		console.log("=".repeat(60))
		console.log(`Total étudiants:           ${stats.totalStudents}`)
		console.log(
			`Note moyenne:              ${stats.averageScore}/100 (${stats.averagePercentage}%)`
		)
		console.log(`Note la plus haute:        ${stats.highestScore}/100`)
		console.log(`Note la plus basse:        ${stats.lowestScore}/100`)
		console.log(
			`Étudiants réussis (≥50%):  ${stats.passedCount}/${stats.totalStudents}`
		)
		console.log(
			`Étudiants échoués (<50%):  ${stats.failedCount}/${stats.totalStudents}`
		)
		console.log(`Notes parfaites (100%):    ${stats.perfectScores}`)
		console.log(`Échecs serveur:            ${stats.serverStartFailures}`)
		console.log("=".repeat(60) + "\n")
	}
}

module.exports = { ReportGenerator }
