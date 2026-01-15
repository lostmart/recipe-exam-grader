const axios = require("axios")

class APITester {
	constructor(baseUrl = "http://localhost:3000", timeout = 5000) {
		this.baseUrl = baseUrl
		this.timeout = timeout
	}

	/**
	 * Run all API tests
	 * @returns {Promise<Array>} Array of test results
	 */
	async runAllTests() {
		const results = []

		console.log("  → Testing GET /api/recipes...")
		results.push(await this.testGetAllRecipes())

		console.log("  → Testing GET /api/recipes/:id...")
		results.push(await this.testGetRecipeById())

		console.log("  → Testing GET /api/recipes/:id 404...")
		results.push(await this.testGetRecipeById404())

		console.log("  → Testing POST valid recipe...")
		results.push(await this.testPostRecipeValid())

		console.log("  → Testing POST validation...")
		results.push(await this.testPostRecipeValidation())

		console.log("  → Testing data persistence...")
		results.push(await this.testDataPersistence())

		console.log("  → Testing error handling...")
		results.push(await this.testErrorHandling())

		return results
	}

	/**
	 * Test GET /api/recipes - Get all recipes
	 */
	async testGetAllRecipes() {
		try {
			const response = await axios.get(`${this.baseUrl}/api/recipes`, {
				timeout: this.timeout,
			})

			const passed =
				response.status === 200 &&
				Array.isArray(response.data) &&
				response.data.length > 0

			return {
				testName: "GET /api/recipes - Récupérer toutes les recettes",
				passed,
				points: passed ? 15 : 0,
				maxPoints: 15,
				details: passed
					? `✓ ${response.data.length} recettes retournées`
					: "✗ Réponse invalide ou vide",
			}
		} catch (error) {
			return {
				testName: "GET /api/recipes",
				passed: false,
				points: 0,
				maxPoints: 15,
				error: this.getErrorMessage(error),
			}
		}
	}

	/**
	 * Test GET /api/recipes/:id - Get recipe by ID
	 */
	async testGetRecipeById() {
		try {
			const response = await axios.get(`${this.baseUrl}/api/recipes/1`, {
				timeout: this.timeout,
			})

			const recipe = response.data
			const passed =
				response.status === 200 &&
				recipe.id === 1 &&
				recipe.name &&
				recipe.cuisine

			return {
				testName: "GET /api/recipes/:id - Récupérer une recette par ID",
				passed,
				points: passed ? 15 : 0,
				maxPoints: 15,
				details: passed
					? `✓ Recette "${recipe.name}" retournée correctement`
					: "✗ Structure de recette invalide",
			}
		} catch (error) {
			return {
				testName: "GET /api/recipes/:id",
				passed: false,
				points: 0,
				maxPoints: 15,
				error: this.getErrorMessage(error),
			}
		}
	}

	/**
	 * Test GET /api/recipes/:id - Should return 404 for non-existent ID
	 */
	async testGetRecipeById404() {
		try {
			await axios.get(`${this.baseUrl}/api/recipes/99999`, {
				timeout: this.timeout,
			})

			// If we get here, the request didn't return 404
			return {
				testName: "GET /api/recipes/:id - Gestion 404",
				passed: false,
				points: 0,
				maxPoints: 10,
				details: "✗ Devrait retourner 404 pour un ID inexistant",
			}
		} catch (error) {
			const passed = error.response && error.response.status === 404

			return {
				testName: "GET /api/recipes/:id - Gestion 404",
				passed,
				points: passed ? 10 : 0,
				maxPoints: 10,
				details: passed
					? "✓ 404 retourné correctement"
					: `✗ Status ${
							error.response ? error.response.status : "N/A"
					  } au lieu de 404`,
			}
		}
	}

	/**
	 * Test POST /api/recipes - Create a valid recipe
	 */
	async testPostRecipeValid() {
		const newRecipe = {
			name: "Test Recette Grader",
			cuisine: "Test",
			difficulty: "Facile",
			prepTime: 15,
			servings: 2,
			ingredients: ["Ingrédient 1", "Ingrédient 2"],
			instructions: "Instructions de test",
		}

		try {
			const response = await axios.post(
				`${this.baseUrl}/api/recipes`,
				newRecipe,
				{ timeout: this.timeout }
			)

			const recipe = response.data
			const passed =
				(response.status === 201 || response.status === 200) &&
				recipe.id &&
				recipe.name === newRecipe.name

			return {
				testName: "POST /api/recipes - Créer une recette valide",
				passed,
				points: passed ? 20 : 0,
				maxPoints: 20,
				details: passed
					? `✓ Recette créée avec ID ${recipe.id}`
					: "✗ Réponse invalide",
			}
		} catch (error) {
			return {
				testName: "POST /api/recipes",
				passed: false,
				points: 0,
				maxPoints: 20,
				error: this.getErrorMessage(error),
			}
		}
	}

	/**
	 * Test POST /api/recipes - Should validate required fields
	 */
	/**
	 * Test POST /api/recipes - Should validate required fields
	 */
	async testPostRecipeValidation() {
		// Test 1: Empty name
		try {
			await axios.post(
				`${this.baseUrl}/api/recipes`,
				{
					name: "",
					cuisine: "Test",
					difficulty: "Facile",
					prepTime: 10,
					servings: 2,
					ingredients: ["Test"],
					instructions: "Test",
				},
				{ timeout: this.timeout }
			)

			// Should not reach here
			return {
				testName: "POST /api/recipes - Validation des champs",
				passed: false,
				points: 0,
				maxPoints: 15,
				details: "✗ Devrait rejeter un nom vide",
			}
		} catch (error) {
			const test1Passed = error.response && error.response.status === 400

			if (!test1Passed) {
				return {
					testName: "POST /api/recipes - Validation des champs",
					passed: false,
					points: 0,
					maxPoints: 15,
					details: `✗ Nom vide: Status ${
						error.response ? error.response.status : "N/A"
					} au lieu de 400`,
				}
			}
		}

		// Test 2: Missing ingredients
		try {
			await axios.post(
				`${this.baseUrl}/api/recipes`,
				{
					name: "Test Recipe",
					cuisine: "Test",
					difficulty: "Facile",
					prepTime: 10,
					servings: 2,
					ingredients: [], // Empty array
					instructions: "Test",
				},
				{ timeout: this.timeout }
			)

			return {
				testName: "POST /api/recipes - Validation des champs",
				passed: false,
				points: 0,
				maxPoints: 15,
				details: "✗ Devrait rejeter une liste d'ingrédients vide",
			}
		} catch (error) {
			const test2Passed = error.response && error.response.status === 400

			if (!test2Passed) {
				return {
					testName: "POST /api/recipes - Validation des champs",
					passed: false,
					points: 0,
					maxPoints: 15,
					details: `✗ Ingrédients vides: Status ${
						error.response ? error.response.status : "N/A"
					} au lieu de 400`,
				}
			}
		}

		// Test 3: Negative prepTime
		try {
			await axios.post(
				`${this.baseUrl}/api/recipes`,
				{
					name: "Test Recipe",
					cuisine: "Test",
					difficulty: "Facile",
					prepTime: -5, // Negative
					servings: 2,
					ingredients: ["Test"],
					instructions: "Test",
				},
				{ timeout: this.timeout }
			)

			return {
				testName: "POST /api/recipes - Validation des champs",
				passed: false,
				points: 0,
				maxPoints: 15,
				details: "✗ Devrait rejeter un temps de préparation négatif",
			}
		} catch (error) {
			const test3Passed = error.response && error.response.status === 400

			if (!test3Passed) {
				return {
					testName: "POST /api/recipes - Validation des champs",
					passed: false,
					points: 0,
					maxPoints: 15,
					details: `✗ Temps négatif: Status ${
						error.response ? error.response.status : "N/A"
					} au lieu de 400`,
				}
			}
		}

		// All validation tests passed
		return {
			testName: "POST /api/recipes - Validation des champs",
			passed: true,
			points: 15,
			maxPoints: 15,
			details:
				"✓ Validation correcte (3 tests réussis: nom vide, ingrédients vides, temps négatif)",
		}
	}

	/**
	 * Test data persistence - Recipe should persist after creation
	 */
	async testDataPersistence() {
		try {
			// Get initial count
			const before = await axios.get(`${this.baseUrl}/api/recipes`)
			const countBefore = before.data.length

			// Add a recipe
			const newRecipe = {
				name: "Persistence Test",
				cuisine: "Test",
				difficulty: "Facile",
				prepTime: 10,
				servings: 1,
				ingredients: ["Test"],
				instructions: "Test",
			}

			await axios.post(`${this.baseUrl}/api/recipes`, newRecipe)

			// Check if it persists
			const after = await axios.get(`${this.baseUrl}/api/recipes`)
			const countAfter = after.data.length

			const passed = countAfter === countBefore + 1

			return {
				testName: "Persistance des données",
				passed,
				points: passed ? 10 : 0,
				maxPoints: 10,
				details: passed
					? "✓ Les données persistent correctement"
					: `✗ Nombre de recettes: avant=${countBefore}, après=${countAfter}`,
			}
		} catch (error) {
			return {
				testName: "Persistance des données",
				passed: false,
				points: 0,
				maxPoints: 10,
				error: this.getErrorMessage(error),
			}
		}
	}

	/**
	 * Test error handling - Should handle errors gracefully
	 */
	async testErrorHandling() {
		try {
			// Test with malformed parameter
			await axios.get(`${this.baseUrl}/api/recipes/abc`, {
				timeout: this.timeout,
			})

			return {
				testName: "Gestion des erreurs",
				passed: false,
				points: 0,
				maxPoints: 10,
				details: "✗ Devrait gérer les erreurs correctement",
			}
		} catch (error) {
			const passed = error.response && error.response.status >= 400

			return {
				testName: "Gestion des erreurs",
				passed,
				points: passed ? 10 : 0,
				maxPoints: 10,
				details: passed
					? "✓ Erreurs gérées avec codes HTTP appropriés"
					: "✗ Gestion des erreurs incorrecte",
			}
		}
	}

	/**
	 * Extract error message from axios error
	 * @param {Error} error
	 * @returns {string}
	 */
	getErrorMessage(error) {
		if (error.response) {
			return `HTTP ${error.response.status}: ${error.message}`
		}
		if (error.code === "ECONNREFUSED") {
			return "Cannot connect to server"
		}
		return error.message || String(error)
	}
}

module.exports = { APITester }
