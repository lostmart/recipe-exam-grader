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

		results.push(await this.testGetAllRecipes())
		results.push(await this.testGetRecipeById())
		results.push(await this.testGetRecipeById404())
		results.push(await this.testPostRecipeValid())
		results.push(await this.testPostRecipeValidation())
		results.push(await this.testDataPersistence())
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
	async testPostRecipeValidation() {
		const invalidRecipe = {
			name: "",
			cuisine: "Test",
			// Missing required fields
		}

		try {
			await axios.post(`${this.baseUrl}/api/recipes`, invalidRecipe, {
				timeout: this.timeout,
			})

			// Should not reach here
			return {
				testName: "POST /api/recipes - Validation des champs",
				passed: false,
				points: 0,
				maxPoints: 15,
				details: "✗ Devrait rejeter les données invalides",
			}
		} catch (error) {
			const passed = error.response && error.response.status === 400

			return {
				testName: "POST /api/recipes - Validation des champs",
				passed,
				points: passed ? 15 : 0,
				maxPoints: 15,
				details: passed
					? "✓ Validation correcte (400 retourné)"
					: `✗ Status ${
							error.response ? error.response.status : "N/A"
					  } au lieu de 400`,
			}
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
