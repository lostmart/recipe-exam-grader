const puppeteer = require('puppeteer');

const FRONTEND_URL = 'http://localhost:5500';
const BACKEND_URL = 'http://localhost:3000';

async function runFrontendTests() {
  console.log('🎨 Running Frontend Tests...\n');
  console.log('='.repeat(60));

  let passedTests = 0;
  let totalTests = 4;
  const testResults = []; // ADD THIS LINE

  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox']
  });

  const page = await browser.newPage();

  // Enable request interception to monitor API calls
  await page.setRequestInterception(true);
  const apiCalls = [];

  page.on('request', request => {
    if (request.url().includes('/api/recipes')) {
      apiCalls.push({
        url: request.url(),
        method: request.method()
      });
    }
    request.continue();
  });

  try {
    // Test 1: Page loads and makes API call
    console.log('\n📍 Test 1: Frontend loads and fetches recipes from API');
    await page.goto(FRONTEND_URL, { waitUntil: 'networkidle0', timeout: 10000 });

    await new Promise(resolve => setTimeout(resolve, 2000));

    const apiCallMade = apiCalls.some(call => 
      call.url === `${BACKEND_URL}/api/recipes` && call.method === 'GET'
    );

    testResults.push({ name: 'Frontend fetches from API', passed: apiCallMade }); // ADD THIS

    if (apiCallMade) {
      console.log('✅ PASSED - Frontend fetched recipes from API');
      console.log(`   API Call: GET ${BACKEND_URL}/api/recipes`);
      passedTests++;
    } else {
      console.log('❌ FAILED - No API call detected');
      console.log('   Expected: GET', `${BACKEND_URL}/api/recipes`);
      console.log('   Detected calls:', apiCalls);
    }

    // Test 2: Recipe cards are displayed
    console.log('\n📍 Test 2: Recipe cards are displayed on homepage');
    
    await page.waitForSelector('.card', { timeout: 5000 });
    
    const recipeCards = await page.$$('.card');
    const cardCount = recipeCards.length;
    const test2Passed = cardCount > 0;

    testResults.push({ name: 'Recipe cards displayed', passed: test2Passed }); // ADD THIS

    if (test2Passed) {
      console.log(`✅ PASSED - ${cardCount} recipe cards displayed`);
      passedTests++;
    } else {
      console.log('❌ FAILED - No recipe cards found');
    }

    // Test 3: Recipe cards show correct data
    console.log('\n📍 Test 3: Recipe cards display correct data');

    const firstCardData = await page.evaluate(() => {
      const card = document.querySelector('.card');
      if (!card) return null;

      const title = card.querySelector('.card-title')?.textContent?.trim();
      const ingredients = card.querySelectorAll('ul li');
      const hasIngredients = ingredients.length > 0;
      const hasButton = card.querySelector('a[href*="recipe.html"]') !== null;

      return {
        hasTitle: !!title && title !== '' && !title.includes('NOM DE LA RECETTE'),
        titleText: title,
        hasIngredients,
        hasButton
      };
    });

    const test3Passed = firstCardData && 
        firstCardData.hasTitle && 
        firstCardData.hasIngredients && 
        firstCardData.hasButton;

    testResults.push({ name: 'Recipe cards show dynamic data', passed: test3Passed }); // ADD THIS

    if (test3Passed) {
      console.log('✅ PASSED - Recipe cards show dynamic data');
      console.log(`   First recipe: "${firstCardData.titleText}"`);
      console.log(`   ✓ Has dynamic title`);
      console.log(`   ✓ Has ingredients list`);
      console.log(`   ✓ Has detail button`);
      passedTests++;
    } else {
      console.log('❌ FAILED - Recipe cards missing data or showing placeholders');
      console.log('   Card data:', firstCardData);
    }

    // Test 4: Detail page loads with correct data
    console.log('\n📍 Test 4: Recipe detail page displays correct data');

    const firstRecipeButton = await page.$('a[href*="recipe.html"]');
    
    if (!firstRecipeButton) {
      console.log('❌ FAILED - No recipe detail button found');
      testResults.push({ name: 'Detail page displays data', passed: false }); // ADD THIS
    } else {
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle0' }),
        firstRecipeButton.click()
      ]);

      await new Promise(resolve => setTimeout(resolve, 2000));

      const currentUrl = page.url();
      const isDetailPage = currentUrl.includes('recipe.html?id=');

      if (!isDetailPage) {
        console.log('❌ FAILED - Did not navigate to detail page');
        console.log('   Current URL:', currentUrl);
        testResults.push({ name: 'Detail page displays data', passed: false }); // ADD THIS
      } else {
        const detailData = await page.evaluate(() => {
          const recipeName = document.querySelector('#recipe-name, h1, h2')?.textContent?.trim();
          const ingredients = document.querySelectorAll('ul li, .ingredient');
          const instructions = document.querySelector('#recipe-instructions, .instructions, p')?.textContent?.trim();
          
          return {
            hasRecipeName: !!recipeName && recipeName !== '',
            recipeName: recipeName,
            ingredientCount: ingredients.length,
            hasInstructions: !!instructions && instructions.length > 10
          };
        });

        const test4Passed = detailData.hasRecipeName && 
            detailData.ingredientCount > 0 && 
            detailData.hasInstructions;

        testResults.push({ name: 'Detail page displays data', passed: test4Passed }); // ADD THIS

        if (test4Passed) {
          console.log('✅ PASSED - Detail page displays dynamic data');
          console.log(`   Recipe: "${detailData.recipeName}"`);
          console.log(`   Ingredients: ${detailData.ingredientCount} items`);
          console.log(`   ✓ Has recipe name`);
          console.log(`   ✓ Has ingredients list`);
          console.log(`   ✓ Has instructions`);
          passedTests++;
        } else {
          console.log('❌ FAILED - Detail page missing data');
          console.log('   Detail data:', detailData);
        }
      }
    }

    console.log('\nℹ️  Keeping browser open for 4 seconds...');
    await new Promise(resolve => setTimeout(resolve, 4000));

  } catch (error) {
    console.error('\n❌ Test error:', error.message);
  } finally {
    await browser.close();
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Frontend Results: ${passedTests}/${totalTests} tests passed\n`);
  
  return {
    passed: passedTests,
    total: totalTests,
    tests: testResults
  };
}

module.exports = { runFrontendTests };

if (require.main === module) {
  runFrontendTests().catch(error => {
    console.error('❌ Frontend test runner error:', error);
    process.exit(1);
  });
}