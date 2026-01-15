export interface Recipe {
	id: number
	name: string
	cuisine: string
	difficulty: "Facile" | "Moyen" | "Difficile"
	prepTime: number
	servings: number
	ingredients: string[]
	instructions: string
	image?: string
}

export interface StudentSubmission {
	studentName: string
	repoPath: string
	githubUrl?: string
}

export interface TestResult {
	testName: string
	passed: boolean
	points: number
	maxPoints: number
	error?: string
	details?: string
}

export interface GradingResult {
	student: StudentSubmission
	totalScore: number
	maxScore: number
	percentage: number
	tests: TestResult[]
	serverStarted: boolean
	timestamp: Date
}

export interface GradingConfig {
	baseUrl: string
	timeout: number
	retries: number
	points: {
		serverStarts: number
		getAllRecipes: number
		getRecipeById: number
		getRecipeById404: number
		postRecipeValid: number
		postRecipeValidation: number
		dataPersistence: number
		errorHandling: number
	}
}
