import axios from "axios"
import { TestResult, Recipe } from "../types"

export class APITester {
	private baseUrl: string
	private timeout: number

	constructor(
		baseUrl: string = "http://localhost:3000",
		timeout: number = 5000
	) {
		this.baseUrl = baseUrl
		this.timeout = timeout
	}

	async runAllTests(): Promise<TestResult[]> {
		const results: TestResult[] = []

		results.push(await this.testGetAllRecipes())
		results.push(await this.testGetRecipeById())
		results.push(await this.testGetRecipeById404())
		results.push(await this.testPostRecipeValid())
		results.push(await this.testPostRecipeValidation())
		results.push(await this.testDataPersistence())
		results.push(await this.testErrorHandling())

		return results
	}

	private async testGetAllRecipes(): Promise<TestResult> {
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
		} catch (error: any) {
			return {
				testName: "GET /api/recipes",
				passed: false,
				points: 0,
				maxPoints: 15,
				error: this.getErrorMessage(error),
			}
		}
	}

	private async testGetRecipeById(): Promise<TestResult> {
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
		} catch (error: any) {
			return {
				testName: "GET /api/recipes/:id",
				passed: false,
				points: 0,
				maxPoints: 15,
				error: this.getErrorMessage(error),
			}
		}
	}

	private async testGetRecipeById404(): Promise<TestResult> {
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
		} catch (error: any) {
			const passed = error.response?.status === 404

			return {
				testName: "GET /api/recipes/:id - Gestion 404",
				passed,
				points: passed ? 10 : 0,
				maxPoints: 10,
				details: passed
					? "✓ 404 retourné correctement"
					: `✗ Status ${error.response?.status} au lieu de 404`,
			}
		}
	}

	private async testPostRecipeValid(): Promise<TestResult> {
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
		} catch (error: any) {
			return {
				testName: "POST /api/recipes",
				passed: false,
				points: 0,
				maxPoints: 20,
				error: this.getErrorMessage(error),
			}
		}
	}

	private async testPostRecipeValidation(): Promise<TestResult> {
		const invalidRecipe = {
			name: "", // Invalid: empty name
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
		} catch (error: any) {
			const passed = error.response?.status === 400

			return {
				testName: "POST /api/recipes - Validation des champs",
				passed,
				points: passed ? 15 : 0,
				maxPoints: 15,
				details: passed
					? "✓ Validation correcte (400 retourné)"
					: `✗ Status ${error.response?.status} au lieu de 400`,
			}
		}
	}

	private async testDataPersistence(): Promise<TestResult> {
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
		} catch (error: any) {
			return {
				testName: "Persistance des données",
				passed: false,
				points: 0,
				maxPoints: 10,
				error: this.getErrorMessage(error),
			}
		}
	}

	private async testErrorHandling(): Promise<TestResult> {
		try {
			// Test with malformed JSON (if possible)
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
		} catch (error: any) {
			const passed = error.response?.status && error.response.status >= 400

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

	private getErrorMessage(error: any): string {
		if (error.response) {
			return `HTTP ${error.response.status}: ${error.message}`
		}
		return error.message || String(error)
	}
}
