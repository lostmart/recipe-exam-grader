const fs = require("fs")
const { parse } = require("csv-parse/sync")

/**
 * Parse the student CSV file and extract students with GitHub repos
 * @param {string} filePath - Path to the CSV file
 * @returns {Array} Array of student objects
 */
function parseStudentCSV(filePath) {
	const fileContent = fs.readFileSync(filePath, "utf-8")

	const records = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
		bom: true,
		relax_column_count: true, // Allow inconsistent column counts
	})

	console.log("CSV columns found:", Object.keys(records[0] || {}))
	console.log(`Total records in CSV: ${records.length}`)

	// Find the GitHub column - it might be empty string '' or contain 'github'
	const firstRecord = records[0]
	let githubColumn = Object.keys(firstRecord).find(
		(key) => key.includes("github") || key.includes("http") || key === ""
	)

	// If we found an empty column name, check if it contains GitHub URLs
	if (githubColumn === "" || !githubColumn) {
		// Check all columns for one that contains github URLs
		for (const key of Object.keys(firstRecord)) {
			const value = firstRecord[key]
			if (value && typeof value === "string" && value.includes("github.com")) {
				githubColumn = key
				break
			}
		}
	}

	if (githubColumn === undefined) {
		console.error("❌ Could not find GitHub URL column in CSV")
		console.log("Available columns:", Object.keys(firstRecord))
		console.log("First record:", firstRecord)
		return []
	}

	console.log(`Using column "${githubColumn}" for GitHub URLs`)

	// Filter students who have a GitHub URL
	const studentsWithRepos = records.filter((record) => {
		const url = record[githubColumn]
		return url && url.trim() !== "" && url.includes("github")
	})

	console.log(`Students with GitHub repos: ${studentsWithRepos.length}`)

	return studentsWithRepos.map((record) => {
		const idColumn = record["ID"] || record["id"]
		const nameColumn =
			record["NOM Prénom"] || record["NOM"] || record["Nom"] || ""

		return {
			studentId: idColumn ? idColumn.trim() : "",
			studentName: nameColumn.trim(),
			githubUrl: record[githubColumn].trim(),
			repoPath: "",
		}
	})
}

module.exports = { parseStudentCSV }
