import { spawn, ChildProcess } from "child_process"
import axios from "axios"
import path from "path"

export class ServerManager {
	private process: ChildProcess | null = null
	private baseUrl: string
	private timeout: number

	constructor(
		baseUrl: string = "http://localhost:3000",
		timeout: number = 30000
	) {
		this.baseUrl = baseUrl
		this.timeout = timeout
	}

	async startServer(repoPath: string): Promise<boolean> {
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
			this.process.stdout?.on("data", (data) => {
				serverOutput += data.toString()
				if (
					data.toString().includes("Server") ||
					data.toString().includes("listening")
				) {
					console.log("Server output detected:", data.toString().trim())
				}
			})

			this.process.stderr?.on("data", (data) => {
				console.error("Server error:", data.toString())
			})

			// Handle process errors
			this.process.on("error", (error) => {
				console.error("Failed to start server:", error)
				resolve(false)
			})

			// Wait for server to be ready
			this.waitForServer()
				.then(() => resolve(true))
				.catch(() => resolve(false))
		})
	}

	private async waitForServer(): Promise<void> {
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

	async stopServer(): Promise<void> {
		if (this.process) {
			console.log("Stopping server...")

			// Kill the process and its children
			if (process.platform === "win32") {
				spawn("taskkill", ["/pid", this.process.pid!.toString(), "/f", "/t"])
			} else {
				this.process.kill("SIGTERM")
			}

			// Wait a bit for cleanup
			await new Promise((resolve) => setTimeout(resolve, 2000))

			this.process = null
		}

		// Extra cleanup: kill any process on port 3000
		await this.killProcessOnPort(3000)
	}

	private async killProcessOnPort(port: number): Promise<void> {
		try {
			if (process.platform === "win32") {
				// Windows
				spawn("netstat", ["-ano", "|", "findstr", `:${port}`])
			} else {
				// Unix-based systems
				spawn("lsof", ["-ti", `:${port}`, "|", "xargs", "kill", "-9"], {
					shell: true,
				})
			}
			await new Promise((resolve) => setTimeout(resolve, 1000))
		} catch (error) {
			// Ignore errors - port might already be free
		}
	}
}
