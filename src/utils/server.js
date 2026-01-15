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

		console.log(`Starting server from: ${backendPath}`)

		return new Promise((resolve) => {
			// Start the server
			this.process = spawn("npm", ["start"], {
				cwd: backendPath,
				shell: true,
				stdio: "pipe",
			})

			let serverOutput = ""

			// Capture output
			if (this.process.stdout) {
				this.process.stdout.on("data", (data) => {
					serverOutput += data.toString()
					if (
						data.toString().includes("Server") ||
						data.toString().includes("listening") ||
						data.toString().includes("started")
					) {
						console.log("Server output detected:", data.toString().trim())
					}
				})
			}

			if (this.process.stderr) {
				this.process.stderr.on("data", (data) => {
					console.error("Server error:", data.toString())
				})
			}

			// Handle process errors
			this.process.on("error", (error) => {
				console.error("Failed to start server:", error)
				resolve(false)
			})

			// Wait for server to be ready
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
		if (this.process) {
			console.log("Stopping server...")

			try {
				// Kill the process and its children
				if (process.platform === "win32") {
					// Windows
					require("child_process").execSync(
						`taskkill /pid ${this.process.pid} /T /F`,
						{
							stdio: "ignore",
						}
					)
				} else {
					// Unix-based systems - kill process group
					try {
						process.kill(-this.process.pid, "SIGKILL")
					} catch (e) {
						// If process group kill fails, try individual process
						this.process.kill("SIGKILL")
					}
				}
			} catch (error) {
				console.log("Process already terminated")
			}

			// Wait for cleanup
			await new Promise((resolve) => setTimeout(resolve, 2000))

			this.process = null
		}

		// Extra cleanup: kill any process on port 3000
		await this.killProcessOnPort(3000)

		console.log("✅ Server stopped and port cleaned")
	}
	
	/**
	 * Kill any process running on a specific port
	 * @param {number} port
	 * @returns {Promise<void>}
	 */
	async killProcessOnPort(port) {
		try {
			if (process.platform === "win32") {
				// Windows: find and kill process on port
				spawn(
					"cmd",
					[
						"/c",
						`for /f "tokens=5" %a in ('netstat -aon ^| findstr :${port}') do taskkill /F /PID %a`,
					],
					{ shell: true }
				)
			} else {
				// Unix-based: use lsof to find and kill
				const killCommand = spawn("sh", [
					"-c",
					`lsof -ti :${port} | xargs kill -9 2>/dev/null || true`,
				])

				await new Promise((resolve) => {
					killCommand.on("close", () => resolve())
					setTimeout(resolve, 1000) // Timeout after 1 second
				})
			}

			await new Promise((resolve) => setTimeout(resolve, 1000))
			console.log(`✓ Cleaned up port ${port}`)
		} catch (error) {
			// Ignore errors - port might already be free
			console.log(`Port ${port} cleanup: ${error.message}`)
		}
	}
}

module.exports = { ServerManager }
