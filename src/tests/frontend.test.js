const puppeteer = require("puppeteer")
const path = require("path")

class FrontendTester {
	constructor(timeout = 10000) {
		this.timeout = timeout
		this.browser = null
		this.page = null
	}

	/**
	 * Initialize browser
	 */
	async initialize() {
		this.browser = await puppeteer.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage", // Overcome limited resource problems
				"--disable-accelerated-2d-canvas",
				"--no-first-run",
				"--no-zygote",
				"--single-process", // This can help with memory
				"--disable-gpu",
			],
		})
		this.page = await this.browser.newPage()

		// Reduce memory usage
		await this.page.setViewport({ width: 1280, height: 720 })
		await this.page.setRequestInterception(true)

		// Block unnecessary resources
		this.page.on("request", (request) => {
			const resourceType = request.resourceType()
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				request.abort()
			} else {
				request.continue()
			}
		})
	}

	/**
	 * Close browser
	 */
	async cleanup() {
		if (this.browser) {
			await this.browser.close()
		}
	}

	/**
	 * Run all frontend tests
	 * @param {string} frontendPath - Path to frontend folder
	 * @returns {Promise<Array>} Array of test results
	 */
	async runAllTests(frontendPath) {
		const results = []

		try {
			await this.initialize()

			// Test 1: Homepage loads and displays recipes
			results.push(await this.testHomepageDisplay(frontendPath))

			// Test 2: Recipe cards show dynamic data
			results.push(await this.testRecipeCardData(frontendPath))

			// Test 3: Detail page loads with data
			results.push(await this.testDetailPageDisplay(frontendPath))
		} catch (error) {
			console.error("Frontend testing error:", error.message)
		} finally {
			await this.cleanup()
		}

		return results
	}

	/**
	 * Test if homepage loads and displays recipes
	 */
	async testHomepageDisplay(frontendPath) {
		try {
			const indexPath = `file://${path.join(frontendPath, "index.html")}`
			await this.page.goto(indexPath, {
				waitUntil: "networkidle0",
				timeout: this.timeout,
			})

			// Wait for recipes to potentially load
			await this.page.waitForTimeout(500)

			// Check if recipe cards exist
			const recipeCards = await this.page.$$(".card")
			const cardCount = recipeCards.length

			const passed = cardCount > 0

			return {
				testName: "Homepage - Affichage des recettes",
				passed,
				points: passed ? 5 : 0,
				maxPoints: 5,
				details: passed
					? `✓ ${cardCount} carte(s) de recette affichée(s)`
					: "✗ Aucune carte de recette trouvée",
			}
		} catch (error) {
			return {
				testName: "Homepage - Affichage des recettes",
				passed: false,
				points: 0,
				maxPoints: 5,
				error: error.message,
			}
		}
	}

	/**
	 * Test if recipe cards display actual dynamic data (not placeholders)
	 */
	async testRecipeCardData(frontendPath) {
		try {
			const indexPath = `file://${path.join(frontendPath, "index.html")}`
			await this.page.goto(indexPath, {
				waitUntil: "networkidle0",
				timeout: this.timeout,
			})

			// Wait for potential API calls
			await this.page.waitForTimeout(2000)

			// Get all card titles
			const cardTitles = await this.page.$$eval(".card-title", (elements) =>
				elements.map((el) => el.textContent.trim())
			)

			// Check if cards have placeholder text (TODOs not completed)
			const hasPlaceholders = cardTitles.some(
				(title) =>
					title.includes("NOM DE LA RECETTE") ||
					title === "" ||
					title.includes("TODO")
			)

			// Check if cards have "MIN DYNAMIQUE" placeholder
			const pageContent = await this.page.content()
			const hasTimeplaceholder = pageContent.includes("MIN DYNAMIQUE")

			// Check if ingredients list has placeholder
			const hasIngredientPlaceholder =
				pageContent.includes("LISTE DYNAMIQUE ICI") ||
				pageContent.includes("- LISTE DYNAMIQUE ICI ! -")

			// Check if instructions have placeholder
			const hasInstructionPlaceholder = pageContent.includes(
				"INSTRUCTIONS DYNAMIQUES ICI"
			)

			const passed =
				!hasPlaceholders &&
				!hasTimeplaceholder &&
				!hasIngredientPlaceholder &&
				!hasInstructionPlaceholder &&
				cardTitles.length > 0

			let details = ""
			if (passed) {
				details = "✓ Données dynamiques affichées correctement"
			} else {
				const issues = []
				if (hasPlaceholders) issues.push("Noms de recettes")
				if (hasTimeplaceholder) issues.push("Temps de préparation")
				if (hasIngredientPlaceholder) issues.push("Ingrédients")
				if (hasInstructionPlaceholder) issues.push("Instructions")
				details = `✗ Placeholders non remplacés: ${issues.join(", ")}`
			}

			return {
				testName: "Homepage - Données dynamiques",
				passed,
				points: passed ? 10 : 0,
				maxPoints: 10,
				details,
			}
		} catch (error) {
			return {
				testName: "Homepage - Données dynamiques",
				passed: false,
				points: 0,
				maxPoints: 10,
				error: error.message,
			}
		}
	}

	/**
	 * Test if detail page displays recipe data
	 */
	async testDetailPageDisplay(frontendPath) {
		try {
			// Try to access detail page with recipe ID 1
			const detailPath = `file://${path.join(frontendPath, "recipe.html")}?id=1`
			await this.page.goto(detailPath, {
				waitUntil: "networkidle0",
				timeout: this.timeout,
			})

			// Wait for potential API calls
			await this.page.waitForTimeout(2000)

			// Check if recipe name is displayed (not placeholder)
			const recipeName = await this.page
				.$eval("#recipe-name", (el) => el.textContent.trim())
				.catch(() => "")

			const hasRecipeName =
				recipeName &&
				recipeName !== "" &&
				!recipeName.includes("NOM DE LA RECETTE")

			// Check if ingredients are displayed
			const ingredientItems = await this.page.$$("ul li")
			const hasIngredients = ingredientItems.length > 0

			// Check if instructions are displayed (not placeholder)
			const instructions = await this.page
				.$eval("#recipe-instructions", (el) => el.textContent.trim())
				.catch(() => "")

			const hasInstructions =
				instructions &&
				instructions !== "" &&
				!instructions.includes("INSTRUCTIONS DYNAMIQUES ICI")

			const passed = hasRecipeName && hasIngredients && hasInstructions

			let details = ""
			if (passed) {
				details = "✓ Page détail affiche les données correctement"
			} else {
				const issues = []
				if (!hasRecipeName) issues.push("Nom de recette")
				if (!hasIngredients) issues.push("Ingrédients")
				if (!hasInstructions) issues.push("Instructions")
				details = `✗ Éléments manquants: ${issues.join(", ")}`
			}

			return {
				testName: "Page détail - Affichage des données",
				passed,
				points: passed ? 5 : 0,
				maxPoints: 5,
				details,
			}
		} catch (error) {
			return {
				testName: "Page détail - Affichage des données",
				passed: false,
				points: 0,
				maxPoints: 5,
				error: error.message,
			}
		}
	}
}

module.exports = { FrontendTester }
