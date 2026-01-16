const express = require("express")
const path = require("path")
const { getAllResults, getResultById } = require("../db/database")

const app = express()
const PORT = 3001

app.use(express.static(__dirname))

app.get("/api/results", (req, res) => {
	const results = getAllResults()
	res.json(results)
})

app.get("/api/results/:id", (req, res) => {
	const result = getResultById(req.params.id)
	if (!result) {
		return res.status(404).json({ error: "Not found" })
	}
	res.json(result)
})

app.listen(PORT, () => {
	console.log(`\n📊 Results viewer running at: http://localhost:${PORT}`)
	console.log("Open this URL in your browser to see all results\n")
})
