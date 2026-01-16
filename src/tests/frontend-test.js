const puppeteer = require("puppeteer")

const FRONTEND_URL = "http://localhost:5500"
const BACKEND_URL = "http://localhost:3000"

async function runFrontendTests() {
	console.log("🎨 Running Frontend Tests...\n")
	console.log("=".repeat(60))

	let passedTests = 0
	let totalTests = 3

	const browser = await puppeteer.launch({
		headless: false, // Set to true to run without opening browser
		args: ["--no-sandbox"],
	})

	const page = await browser.newPage()

	// Enable request interception to monitor API calls
	await page.setRequestInterception(true)
	const apiCalls = []

	page.on("request", (request) => {
		if (request.url().includes("/api/recipes")) {
			apiCalls.push({
				url: request.url(),
				method: request.method(),
			})
		}
		request.continue()
	})

	try {
		// Test 1: Page loads and makes API call
		console.log("\n📍 Test 1: Frontend loads and fetches recipes from API")
		await page.goto(FRONTEND_URL, { waitUntil: "networkidle0", timeout: 10000 })

		// Wait a bit for API calls to complete
		await new Promise((resolve) => setTimeout(resolve, 2000))

		const apiCallMade = apiCalls.some(
			(call) =>
				call.url === `${BACKEND_URL}/api/recipes` && call.method === "GET"
		)

		if (apiCallMade) {
			console.log("✅ PASSED - Frontend fetched recipes from API")
			console.log(`   API Call: GET ${BACKEND_URL}/api/recipes`)
			passedTests++
		} else {
			console.log("❌ FAILED - No API call detected")
			console.log("   Expected: GET", `${BACKEND_URL}/api/recipes`)
			console.log("   Detected calls:", apiCalls)
		}

		// Test 2: Recipe cards are displayed
		console.log("\n📍 Test 2: Recipe cards are displayed on homepage")

		// Wait for recipe cards to appear
		await page.waitForSelector(".card", { timeout: 5000 })

		const recipeCards = await page.$$(".card")
		const cardCount = recipeCards.length

		if (cardCount > 0) {
			console.log(`✅ PASSED - ${cardCount} recipe cards displayed`)
			passedTests++
		} else {
			console.log("❌ FAILED - No recipe cards found")
		}

		// Test 3: Recipe cards show correct data
		console.log("\n📍 Test 3: Recipe cards display correct data")

		// Get data from first recipe card
		const firstCardData = await page.evaluate(() => {
			const card = document.querySelector(".card")
			if (!card) return null

			const title = card.querySelector(".card-title")?.textContent?.trim()
			const ingredients = card.querySelectorAll("ul li")
			const hasIngredients = ingredients.length > 0
			const hasButton = card.querySelector('a[href*="recipe.html"]') !== null

			return {
				hasTitle:
					!!title && title !== "" && !title.includes("NOM DE LA RECETTE"),
				titleText: title,
				hasIngredients,
				hasButton,
			}
		})

		if (
			firstCardData &&
			firstCardData.hasTitle &&
			firstCardData.hasIngredients &&
			firstCardData.hasButton
		) {
			console.log("✅ PASSED - Recipe cards show dynamic data")
			console.log(`   First recipe: "${firstCardData.titleText}"`)
			console.log(`   ✓ Has dynamic title`)
			console.log(`   ✓ Has ingredients list`)
			console.log(`   ✓ Has detail button`)
			passedTests++
		} else {
			console.log(
				"❌ FAILED - Recipe cards missing data or showing placeholders"
			)
			console.log("   Card data:", firstCardData)
		}

		// Keep browser open for a moment so you can see the page
		console.log("\nℹ️  Keeping browser open for 3 seconds...")
		await new Promise((resolve) => setTimeout(resolve, 3000))
	} catch (error) {
		console.error("\n❌ Test error:", error.message)
	} finally {
		await browser.close()
	}

	// Summary
	console.log("\n" + "=".repeat(60))
	console.log(
		`\n📊 Frontend Results: ${passedTests}/${totalTests} tests passed\n`
	)
}

runFrontendTests().catch((error) => {
	console.error("❌ Frontend test runner error:", error)
	process.exit(1)
})
