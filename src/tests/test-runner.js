const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function runTests() {
  console.log('🧪 Running Tests...\n');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = 6; // 4 required + 2 optional
  let bonusTests = 0;
  
  const testResults = []; // Store all test results

  // Test 1: GET / - Welcome message
  console.log('\n📍 Test 1: GET /');
  try {
    const response = await axios.get(`${BASE_URL}/`);
    
    const passed = response.status === 200 && 
        response.data.message === "Welcome To EPITA'S Exam !";
    
    testResults.push({ name: 'GET / - Welcome message', passed });
    
    if (passed) {
      console.log('✅ PASSED - Correct welcome message');
      passedTests++;
    } else {
      console.log('❌ FAILED - Unexpected response');
      console.log('Expected:', { message: "Welcome To EPITA'S Exam !" });
      console.log('Received:', response.data);
    }
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    testResults.push({ name: 'GET / - Welcome message', passed: false });
  }

  // Test 2: GET /api/recipes - All recipes
  console.log('\n📍 Test 2: GET /api/recipes');
  try {
    const response = await axios.get(`${BASE_URL}/api/recipes`);
    
    let passed = false;
    if (response.status === 200 && Array.isArray(response.data)) {
      const recipeCount = response.data.length;
      
      const firstRecipe = response.data[0];
      const hasCorrectStructure = firstRecipe &&
        firstRecipe.id &&
        firstRecipe.name &&
        firstRecipe.cuisine &&
        firstRecipe.difficulty &&
        firstRecipe.prepTime &&
        firstRecipe.servings &&
        Array.isArray(firstRecipe.ingredients) &&
        firstRecipe.instructions;

      if (hasCorrectStructure) {
        console.log(`✅ PASSED - Received ${recipeCount} recipes with correct structure`);
        console.log(`   First recipe: "${firstRecipe.name}"`);
        passed = true;
        passedTests++;
      } else {
        console.log('❌ FAILED - Recipes have incorrect structure');
        console.log('First recipe:', firstRecipe);
      }
    } else {
      console.log('❌ FAILED - Response is not an array');
      console.log('Received:', response.data);
    }
    
    testResults.push({ name: 'GET /api/recipes - All recipes', passed });
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    testResults.push({ name: 'GET /api/recipes - All recipes', passed: false });
  }

  // Test 3: GET /api/recipes/:id - Single recipe
  console.log('\n📍 Test 3: GET /api/recipes/:id');
  try {
    const response = await axios.get(`${BASE_URL}/api/recipes/1`);
    
    let passed = false;
    if (response.status === 200) {
      const recipe = response.data;
      
      if (recipe.id && recipe.name) {
        console.log('✅ PASSED - Received recipe with ID 1');
        console.log(`   Recipe: "${recipe.name}"`);
        passed = true;
        passedTests++;
      } else {
        console.log('❌ FAILED - Response is not a valid recipe');
        console.log('Received:', recipe);
      }
    } else {
      console.log(`❌ FAILED - Expected 200, got ${response.status}`);
    }
    
    testResults.push({ name: 'GET /api/recipes/:id - Single recipe', passed });
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    testResults.push({ name: 'GET /api/recipes/:id - Single recipe', passed: false });
  }

  // Test 4: POST /api/recipes - Create recipe
  console.log('\n📍 Test 4: POST /api/recipes');
  let createdRecipeId = null;
  try {
    const newRecipe = {
      name: "Test Recipe from Grader",
      cuisine: "Test",
      difficulty: "Facile",
      prepTime: 15,
      servings: 2,
      ingredients: ["Ingredient 1", "Ingredient 2"],
      instructions: "Test instructions"
    };

    const response = await axios.post(`${BASE_URL}/api/recipes`, newRecipe);
    
    let passed = false;
    if (response.status === 201) {
      const createdRecipe = response.data;
      
      if (createdRecipe.id && createdRecipe.name === newRecipe.name) {
        console.log('✅ PASSED - Recipe created successfully');
        console.log(`   Created recipe with ID: ${createdRecipe.id}`);
        createdRecipeId = createdRecipe.id;
        passed = true;
        passedTests++;
      } else {
        console.log('❌ FAILED - Recipe created but data is incorrect');
        console.log('Received:', createdRecipe);
      }
    } else {
      console.log(`❌ FAILED - Expected 201, got ${response.status}`);
    }
    
    testResults.push({ name: 'POST /api/recipes - Create recipe', passed });
  } catch (error) {
    console.log('❌ FAILED - Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
    }
    testResults.push({ name: 'POST /api/recipes - Create recipe', passed: false });
  }

  // Test 5: PUT /api/recipes/:id - Update recipe (BONUS)
  console.log('\n📍 Test 5: PUT /api/recipes/:id (BONUS)');
  try {
    if (!createdRecipeId) {
      console.log('⏭️  SKIPPED - No recipe ID available from POST test');
      testResults.push({ name: 'PUT /api/recipes/:id - Update (BONUS)', passed: false });
    } else {
      const updateData = {
        name: "Updated Test Recipe",
        prepTime: 25
      };

      const response = await axios.put(`${BASE_URL}/api/recipes/${createdRecipeId}`, updateData);
      
      let passed = false;
      if (response.status === 200) {
        const updatedRecipe = response.data;
        
        if (updatedRecipe.name === updateData.name && updatedRecipe.prepTime === updateData.prepTime) {
          console.log('✅ BONUS PASSED - Recipe updated successfully');
          console.log(`   Updated recipe: "${updatedRecipe.name}"`);
          passed = true;
          bonusTests++;
        } else {
          console.log('❌ BONUS FAILED - Recipe not updated correctly');
          console.log('Received:', updatedRecipe);
        }
      } else {
        console.log(`❌ BONUS FAILED - Expected 200, got ${response.status}`);
      }
      
      testResults.push({ name: 'PUT /api/recipes/:id - Update (BONUS)', passed });
    }
  } catch (error) {
    console.log('❌ BONUS FAILED - Error:', error.message);
    if (error.response && error.response.status === 404) {
      console.log('   Route might not be implemented');
    }
    testResults.push({ name: 'PUT /api/recipes/:id - Update (BONUS)', passed: false });
  }

  // Test 6: DELETE /api/recipes/:id - Delete recipe (BONUS)
  console.log('\n📍 Test 6: DELETE /api/recipes/:id (BONUS)');
  try {
    if (!createdRecipeId) {
      console.log('⏭️  SKIPPED - No recipe ID available from POST test');
      testResults.push({ name: 'DELETE /api/recipes/:id - Delete (BONUS)', passed: false });
    } else {
      const response = await axios.delete(`${BASE_URL}/api/recipes/${createdRecipeId}`);
      
      let passed = false;
      if (response.status === 200) {
        console.log('✅ BONUS PASSED - Recipe deleted successfully');
        
        // Verify it's actually deleted
        try {
          await axios.get(`${BASE_URL}/api/recipes/${createdRecipeId}`);
          console.log('   ⚠️  Warning: Recipe still exists after delete');
        } catch (getError) {
          if (getError.response && getError.response.status === 404) {
            console.log('   ✓ Verified: Recipe no longer exists');
            passed = true;
            bonusTests++;
          }
        }
      } else {
        console.log(`❌ BONUS FAILED - Expected 200, got ${response.status}`);
      }
      
      testResults.push({ name: 'DELETE /api/recipes/:id - Delete (BONUS)', passed });
    }
  } catch (error) {
    console.log('❌ BONUS FAILED - Error:', error.message);
    if (error.response && error.response.status === 404) {
      console.log('   Route might not be implemented');
    }
    testResults.push({ name: 'DELETE /api/recipes/:id - Delete (BONUS)', passed: false });
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Results: ${passedTests}/4 required tests passed`);
  if (bonusTests > 0) {
    console.log(`🌟 Bonus: ${bonusTests}/2 bonus tests passed`);
  }
  console.log('');
  
  // Return results for database storage
  return {
    passed: passedTests,
    total: 4, // Only count required tests
    tests: testResults
  };
}

// Export for use in main grader
module.exports = { runTests };

// Run if called directly
if (require.main === module) {
  runTests().catch(error => {
    console.error('❌ Test runner error:', error);
    process.exit(1);
  });
}