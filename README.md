# Recipe Exam Grader

Grades a recipe based on a set of criteria.

## Project Architecture

The project is structured as follows:

```text
recipe-exam-grader/
├── src/
│ ├── index.ts # Main entry point
│ ├── types/
│ │ └── index.ts # TypeScript interfaces
│ ├── services/
│ │ └── grader.ts # Main grading logic
│ ├── utils/
│ │ ├── server.ts # Server management (start/stop)
│ │ └── report.ts # Report generation
│ └── tests/
│ └── api.test.ts # API test cases
├── students/ # Where student repos go
├── results/ # Grading results output
├── package.json
└── tsconfig.json
```

## Type Definitions

```typescript
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
```
