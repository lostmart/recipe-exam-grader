import fs from "fs"
import { parse } from "csv-parse/sync"
import { StudentSubmission } from "../types"

export function parseStudentCSV(filePath: string): StudentSubmission[] {
	const fileContent = fs.readFileSync(filePath, "utf-8")

	const records = parse(fileContent, {
		columns: true,
		skip_empty_lines: true,
		trim: true,
	})

	return records
		.filter((record: any) => record["https://github.com/"]) // Only students with repos
		.map((record: any) => ({
			studentName: record["NOM Prénom"].trim(),
			studentId: record["ID"].trim(),
			githubUrl: record["https://github.com/"].trim(),
			repoPath: "", // Will be set after cloning
		}))
}
