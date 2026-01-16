const path = require('path');
const { runTests: runBackendTests } = require('../tests/test-runner');
const { runFrontendTests } = require('../tests/frontend-test');
const { saveResults } = require('../db/database');

async function grade(repoUrl) {
  console.log('\n🎓 Starting Full Stack Grading...\n');
  
  const repoName = path.basename(repoUrl, '.git');
  
  // Run backend tests
  console.log('='.repeat(60));
  console.log('BACKEND TESTS');
  console.log('='.repeat(60));
  const backendResults = await runBackendTests();
  
  // Wait a bit between test suites
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Run frontend tests
  console.log('\n' + '='.repeat(60));
  console.log('FRONTEND TESTS');
  console.log('='.repeat(60));
  const frontendResults = await runFrontendTests();
  
  // Save to database
  const resultId = saveResults(repoUrl, repoName, backendResults, frontendResults);
  
  // Final summary
  const totalScore = backendResults.passed + frontendResults.passed;
  const totalPossible = backendResults.total + frontendResults.total;
  const percentage = ((totalScore / totalPossible) * 100).toFixed(1);
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 FINAL RESULTS');
  console.log('='.repeat(60));
  console.log(`Repository: ${repoName}`);
  console.log(`Backend: ${backendResults.passed}/${backendResults.total}`);
  console.log(`Frontend: ${frontendResults.passed}/${frontendResults.total}`);
  console.log(`TOTAL: ${totalScore}/${totalPossible} (${percentage}%)`);
  console.log('='.repeat(60));
  console.log(`\n✅ Results saved to database (ID: ${resultId})`);
  console.log(`📊 View all results at: http://localhost:3001\n`);
}

// Get repo URL from command line
const repoUrl = process.argv[2];

if (!repoUrl) {
  console.error('Usage: node src/services/grade.js <repo-url>');
  process.exit(1);
}

grade(repoUrl).catch(error => {
  console.error('❌ Grading error:', error);
  process.exit(1);
});