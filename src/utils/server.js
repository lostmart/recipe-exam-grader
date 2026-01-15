const { spawn } = require("child_process")
const axios = require("axios")
const path = require("path")

class ServerManager {
	constructor(baseUrl = "http://localhost:3000", timeout = 30000) {
		this.process = null
		this.baseUrl = baseUrl
		this.timeout = timeout
	}

	/**
	 * Start the student's backend server
	 * @param {string} repoPath - Path to the student's repo
	 * @returns {Promise<boolean>} - True if server started successfully
	 */
	async startServer(repoPath) {
		const backendPath = path.join(repoPath, "backend")
		const fs = require("fs")

		console.log(`Starting server from: ${backendPath}`)

		// Try multiple possible entry points IN THIS ORDER
		const possibleEntryPoints = [
			"index.js", // Check index.js FIRST (most common)
			"server.js",
			"app.js",
			"main.js",
			"src/server.js",
			"src/index.js",
		]

		let entryPoint = null
		for (const file of possibleEntryPoints) {
			if (fs.existsSync(path.join(backendPath, file))) {
				entryPoint = file
				console.log(`Found entry point: ${file}`)
				break
			}
		}

		// If still not found, check package.json
		if (!entryPoint) {
			try {
				const packageJsonPath = path.join(backendPath, "package.json")
				const packageJson = JSON.parse(
					fs.readFileSync(packageJsonPath, "utf-8")
				)

				// Check main field
				if (
					packageJson.main &&
					fs.existsSync(path.join(backendPath, packageJson.main))
				) {
					entryPoint = packageJson.main
					console.log(`Using main from package.json: ${entryPoint}`)
				}

				// Check start script
				if (!entryPoint && packageJson.scripts && packageJson.scripts.start) {
					const startScript = packageJson.scripts.start
					const nodeMatch = startScript.match(/node\s+(\S+\.js)/)
					if (nodeMatch) {
						const file = nodeMatch[1]
						if (fs.existsSync(path.join(backendPath, file))) {
							entryPoint = file
							console.log(`Extracted from start script: ${entryPoint}`)
						}
					}
				}
			} catch (error) {
				console.log("Could not parse package.json:", error.message)
			}
		}

		// Last resort: use npm start
		let command, args
		if (entryPoint) {
			command = "node"
			args = [entryPoint]
		} else {
			console.log("No entry point found, falling back to npm start")
			command = "npm"
			args = ["start"]
		}

		return new Promise((resolve) => {
			this.process = spawn(command, args, {
				cwd: backendPath,
				shell: command === "npm",
				stdio: "pipe",
			})

			if (this.process.stdout) {
				this.process.stdout.on("data", (data) => {
					const output = data.toString()
					if (
						output.includes("Server") ||
						output.includes("listening") ||
						output.includes("started") ||
						output.includes("port")
					) {
						console.log("Server output detected:", output.trim())
					}
				})
			}

			if (this.process.stderr) {
				this.process.stderr.on("data", (data) => {
					const output = data.toString()
					// Only show real errors, not warnings
					if (
						output.includes("Error: Cannot find module") ||
						output.includes("EADDRINUSE")
					) {
						console.error("Server error:", output)
					}
				})
			}

			this.process.on("error", (error) => {
				console.error("Failed to start server:", error)
				resolve(false)
			})

			this.waitForServer()
				.then(() => resolve(true))
				.catch((err) => {
					console.error("Server failed to start:", err.message)
					resolve(false)
				})
		})
	}

	/**
	 * Wait for the server to be ready by polling the API
	 * @returns {Promise<void>}
	 */
	async waitForServer() {
		const startTime = Date.now()
		const retryInterval = 1000 // Check every second

		while (Date.now() - startTime < this.timeout) {
			try {
				await axios.get(`${this.baseUrl}/api/recipes`, { timeout: 2000 })
				console.log("✓ Server is ready!")
				return
			} catch (error) {
				// Server not ready yet, wait and retry
				await new Promise((resolve) => setTimeout(resolve, retryInterval))
			}
		}

		throw new Error("Server failed to start within timeout period")
	}

	/**
	 * Stop the server and clean up
	 * @returns {Promise<void>}
	 */
	async stopServer() {
		console.log("Stopping server...")

		if (this.process && this.process.pid) {
			try {
				// Simple force kill
				this.process.kill("SIGKILL")
				await new Promise((resolve) => setTimeout(resolve, 500))
			} catch (error) {
				// Ignore errors
			}
			this.process = null
		}

		console.log("✅ Server cleanup complete")
	}
}

module.exports = { ServerManager }
