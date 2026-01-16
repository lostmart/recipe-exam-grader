const { execSync, spawn } = require("child_process")
const path = require("path")
const fs = require("fs")

async function main() {
	// Get repo URL from command line argument
	const repoUrl = process.argv[2]

	if (!repoUrl) {
		console.error("❌ Please provide a repository URL")
		console.log("Usage: node src/index.js <repo-url>")
		process.exit(1)
	}

	console.log("🎓 Recipe Exam Grader - Single Repo Mode\n")
	console.log(`Repository: ${repoUrl}\n`)

	// Extract repo name from URL
	const repoName = path.basename(repoUrl, ".git")
	const repoPath = path.join(__dirname, "../students", repoName)

	// Step 1: Clone repository
	if (fs.existsSync(repoPath)) {
		console.log(`⏭️  Repository already exists: ${repoPath}`)
	} else {
		console.log(`📦 Cloning repository...`)
		try {
			execSync(`git clone ${repoUrl} "${repoPath}"`, {
				stdio: "inherit",
				timeout: 60000,
			})
			console.log("✅ Repository cloned\n")
		} catch (error) {
			console.error("❌ Failed to clone repository:", error.message)
			process.exit(1)
		}
	}

	// Step 2: Check backend folder exists
	const backendPath = path.join(repoPath, "backend")
	if (!fs.existsSync(backendPath)) {
		console.error("❌ Backend folder not found")
		process.exit(1)
	}

	// Step 3: Install dependencies
	const nodeModulesPath = path.join(backendPath, "node_modules")
	if (fs.existsSync(nodeModulesPath)) {
		console.log("⏭️  Dependencies already installed\n")
	} else {
		console.log("📦 Installing dependencies...")
		try {
			execSync("npm install", {
				cwd: backendPath,
				stdio: "inherit",
				timeout: 120000,
			})
			console.log("✅ Dependencies installed\n")
		} catch (error) {
			console.error("❌ Failed to install dependencies:", error.message)
			process.exit(1)
		}
	}

	// Step 4: Start the server
	console.log("🚀 Starting server...\n")

	const serverProcess = spawn("npm", ["run dev"], {
		cwd: backendPath,
		shell: true,
		stdio: "inherit",
	})

	serverProcess.on("error", (error) => {
		console.error("❌ Failed to start server:", error.message)
		process.exit(1)
	})

	serverProcess.on("exit", (code) => {
		console.log(`\n📝 Server exited with code ${code}`)
		process.exit(code)
	})

	console.log("✅ Server is running. Press Ctrl+C to stop.\n")
}

main().catch((error) => {
	console.error("❌ Fatal error:", error)
	process.exit(1)
})
