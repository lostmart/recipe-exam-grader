const fs = require("fs")
const path = require("path")

class ReportGenerator {
	/**
	 * Generate a markdown report for all students
	 */
	generateMarkdownReport(results, stats) {
		let markdown = ""

		// Header
		markdown += "# 📊 Rapport de Correction - Examen Web Development\n\n"
		markdown += `**Date:** ${new Date().toLocaleString("fr-FR")}\n\n`
		markdown += `**Nombre d'étudiants:** ${stats.totalStudents}\n\n`
		markdown += "---\n\n"

		// Summary Statistics
		markdown += "## 📈 Statistiques Globales\n\n"
		markdown += `| Métrique | Valeur |\n`
		markdown += `|----------|--------|\n`
		markdown += `| Note moyenne | ${stats.averageScore}/100 (${stats.averagePercentage}%) |\n`
		markdown += `| Note la plus haute | ${stats.highestScore}/100 |\n`
		markdown += `| Note la plus basse | ${stats.lowestScore}/100 |\n`
		markdown += `| Étudiants réussis (≥50%) | ${stats.passedCount}/${stats.totalStudents} |\n`
		markdown += `| Étudiants échoués (<50%) | ${stats.failedCount}/${stats.totalStudents} |\n`
		markdown += `| Notes parfaites (100%) | ${stats.perfectScores} |\n`
		markdown += `| Échecs de démarrage serveur | ${stats.serverStartFailures} |\n`
		markdown += "\n---\n\n"

		// Individual Results
		markdown += "## 👨‍🎓 Résultats Individuels\n\n"

		// Sort by score (highest first)
		const sortedResults = [...results].sort(
			(a, b) => b.totalScore - a.totalScore
		)

		sortedResults.forEach((result, index) => {
			const rank = index + 1
			const emoji = this.getScoreEmoji(result.percentage)

			markdown += `### ${rank}. ${result.student.studentName} ${emoji}\n\n`
			markdown += `**ID:** ${result.student.studentId}\n\n`
			markdown += `**Score Total:** ${result.totalScore}/${result.maxScore} (${result.percentage}%)\n\n`

			if (result.student.githubUrl) {
				markdown += `**Repository:** [${result.student.githubUrl}](${result.student.githubUrl})\n\n`
			}

			// Server status
			if (result.serverStarted) {
				markdown += `**Serveur:** ✅ Démarré avec succès\n\n`
			} else {
				markdown += `**Serveur:** ❌ Échec de démarrage\n\n`
			}

			// Errors
			if (result.errors && result.errors.length > 0) {
				markdown += `**Erreurs:**\n`
				result.errors.forEach((error) => {
					markdown += `- ⚠️ ${error}\n`
				})
				markdown += "\n"
			}

			// Test Results
			if (result.tests && result.tests.length > 0) {
				markdown += "#### Détails des Tests\n\n"
				markdown += "| Test | Résultat | Points |\n"
				markdown += "|------|----------|--------|\n"

				result.tests.forEach((test) => {
					const status = test.passed ? "✅" : "❌"
					const details = test.details || test.error || ""
					markdown += `| ${test.testName} | ${status} ${details} | ${test.points}/${test.maxPoints} |\n`
				})
				markdown += "\n"
			}

			markdown += "---\n\n"
		})

		return markdown
	}

	/**
	 * Generate a CSV report for all students
	 */
	generateCSVReport(results) {
		let csv = "ID,Nom,Score Total,Pourcentage,Serveur Démarré,"

		// Get test names from first result
		if (results.length > 0 && results[0].tests) {
			const testNames = results[0].tests.map((t) => `"${t.testName}"`)
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
	 */
	saveReport(content, filename, outputDir = "./results") {
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
	 */
	generateAllReports(results, stats, outputDir = "./results") {
		const timestamp = new Date()
			.toISOString()
			.replace(/[:.]/g, "-")
			.slice(0, -5)

		// Generate each report
		const markdownReport = this.generateMarkdownReport(results, stats)
		const csvReport = this.generateCSVReport(results)
		const jsonReport = this.generateJSONReport(results, stats)

		// Save each report
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
