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

	// Step 3: Check frontend folder exists
	const frontendPath = path.join(repoPath, "frontend")
	if (!fs.existsSync(frontendPath)) {
		console.warn("⚠️  Frontend folder not found - skipping frontend server")
	}

	// Step 4: Install dependencies
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

	// Step 5: Start the backend server
	console.log("🚀 Starting backend server...\n")

	const backendProcess = spawn("npm", ["run", "dev"], {
		cwd: backendPath,
		shell: true,
		stdio: "inherit",
	})

	backendProcess.on("error", (error) => {
		console.error("❌ Failed to start backend:", error.message)
		process.exit(1)
	})

	// Step 6: Start the frontend server (if frontend exists)
	let frontendProcess = null
	if (fs.existsSync(frontendPath)) {
		console.log("🎨 Starting frontend server...\n")

		frontendProcess = spawn(
			"npx",
			["live-server", frontendPath, "--port=5500", "--no-browser"],
			{
				shell: true,
				stdio: "pipe",
			}
		)

		frontendProcess.stdout.on("data", (data) => {
			console.log("[Frontend]", data.toString().trim())
		})

		frontendProcess.on("error", (error) => {
			console.error("❌ Failed to start frontend:", error.message)
		})

		// Wait a moment for servers to start
		setTimeout(() => {
			console.log("\n" + "=".repeat(60))
			console.log("✅ Servers are running!")
			console.log("=".repeat(60))
			console.log("🔗 Backend:  http://localhost:3000")
			console.log("🔗 Frontend: http://localhost:5500")
			console.log("=".repeat(60))
			console.log("\nPress Ctrl+C to stop both servers.\n")
		}, 2000)
	} else {
		console.log("\n✅ Backend server is running on http://localhost:3000")
		console.log("Press Ctrl+C to stop.\n")
	}

	// Handle Ctrl+C gracefully
	process.on("SIGINT", () => {
		console.log("\n\n🛑 Stopping servers...")
		backendProcess.kill()
		if (frontendProcess) {
			frontendProcess.kill()
		}
		process.exit(0)
	})
}

main().catch((error) => {
	console.error("❌ Fatal error:", error)
	process.exit(1)
})
