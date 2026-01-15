const { parseStudentCSV } = require("./utils/csv-parser")
const { Grader } = require("./services/grader")
const { ReportGenerator } = require("./utils/report")
const path = require("path")
const { execSync } = require("child_process")
const fs = require("fs")

/**
 * Clone a git repository
 * @param {string} githubUrl - GitHub repository URL
 * @param {string} targetDir - Directory to clone into
 * @returns {boolean} Success status
 */
function cloneRepository(githubUrl, targetDir) {
	try {
		console.log(`Cloning ${githubUrl}...`)
		execSync(`git clone ${githubUrl} "${targetDir}"`, {
			stdio: "inherit",
			timeout: 60000, // 60 second timeout
		})
		return true
	} catch (error) {
		console.error(`Failed to clone ${githubUrl}:`, error.message)
		return false
	}
}

/**
 * Install npm dependencies for a student's backend
 * @param {string} backendPath - Path to backend folder
 * @returns {boolean} Success status
 */
function installDependencies(backendPath) {
	try {
		console.log(`Installing dependencies in ${backendPath}...`)
		execSync("npm install", {
			cwd: backendPath,
			stdio: "inherit",
			timeout: 120000, // 2 minute timeout
		})
		return true
	} catch (error) {
		console.error(`Failed to install dependencies:`, error.message)
		return false
	}
}

/**
 * Main grading function
 */
async function main() {
	console.log("🎓 Recipe Exam Auto-Grader\n")

	// Configuration
	const CSV_FILE = "./students.csv" // Path to your CSV file
	const REPOS_DIR = "./students" // Directory to clone repos into
	const RESULTS_DIR = "./results" // Directory for reports

	// Check if CSV file exists
	if (!fs.existsSync(CSV_FILE)) {
		console.error(`❌ CSV file not found: ${CSV_FILE}`)
		console.log(
			"Please create a students.csv file with columns: ID, NOM Prénom, https://github.com/"
		)
		process.exit(1)
	}

	// Parse student list from CSV
	console.log(`📄 Reading students from ${CSV_FILE}...`)
	const students = parseStudentCSV(CSV_FILE)
	console.log(`✅ Found ${students.length} students with GitHub repositories\n`)

	if (students.length === 0) {
		console.error("❌ No students with GitHub URLs found in CSV")
		process.exit(1)
	}

	// Create repos directory if it doesn't exist
	if (!fs.existsSync(REPOS_DIR)) {
		fs.mkdirSync(REPOS_DIR, { recursive: true })
	}

	// Step 1: Clone repositories and install dependencies
	console.log("📦 Cloning repositories and installing dependencies...\n")

	for (const student of students) {
		const repoName = path.basename(student.githubUrl, ".git")
		const repoPath = path.join(REPOS_DIR, `${student.studentId}_${repoName}`)
		student.repoPath = repoPath

		// Check if repo already exists
		if (fs.existsSync(repoPath)) {
			console.log(`⏭️  Repository already exists: ${repoPath}`)
		} else {
			// Clone the repository
			const cloneSuccess = cloneRepository(student.githubUrl, repoPath)
			if (!cloneSuccess) {
				console.error(`❌ Failed to clone repo for ${student.studentName}`)
				continue
			}
		}

		// Install dependencies
		const backendPath = path.join(repoPath, "backend")
		if (fs.existsSync(backendPath)) {
			const nodeModulesPath = path.join(backendPath, "node_modules")

			if (fs.existsSync(nodeModulesPath)) {
				console.log(
					`⏭️  Dependencies already installed for ${student.studentName}`
				)
			} else {
				const installSuccess = installDependencies(backendPath)
				if (!installSuccess) {
					console.error(
						`❌ Failed to install dependencies for ${student.studentName}`
					)
				}
			}
		} else {
			console.error(`❌ Backend folder not found for ${student.studentName}`)
		}

		console.log("") // Empty line for readability
	}

	// Step 2: Grade all students
	console.log("\n" + "=".repeat(60))
	console.log("🎯 Starting Grading Process")
	console.log("=".repeat(60) + "\n")

	const grader = new Grader()
	const results = await grader.gradeMultipleStudents(students)

	// Step 3: Generate reports
	console.log("\n📝 Generating reports...\n")

	const reportGenerator = new ReportGenerator()
	const stats = grader.getSummaryStats(results)

	// Print summary to console
	reportGenerator.printSummary(stats)

	// Save all report formats
	const reportPaths = reportGenerator.generateAllReports(
		results,
		stats,
		RESULTS_DIR
	)

	console.log("\n✅ Grading complete!\n")
	console.log("📄 Reports generated:")
	console.log(`   - Markdown: ${reportPaths.markdown}`)
	console.log(`   - CSV: ${reportPaths.csv}`)
	console.log(`   - JSON: ${reportPaths.json}`)
	console.log("\n")
}

// Run the grader
main().catch((error) => {
	console.error("❌ Fatal error:", error)
	process.exit(1)
})
