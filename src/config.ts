import { GradingConfig } from "./types"

export const config: GradingConfig = {
	baseUrl: "http://localhost:3000",
	timeout: 5000,
	retries: 3,
	points: {
		serverStarts: 5,
		getAllRecipes: 15,
		getRecipeById: 15,
		getRecipeById404: 10,
		postRecipeValid: 20,
		postRecipeValidation: 15,
		dataPersistence: 10,
		errorHandling: 10,
	},
}
