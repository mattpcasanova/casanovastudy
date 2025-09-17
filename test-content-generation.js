#!/usr/bin/env node

/**
 * Test script for content generation without PDF creation
 * This allows testing and optimizing the Claude API prompt without generating PDFs
 * 
 * Usage:
 * node test-content-generation.js
 * 
 * This script will:
 * 1. Use sample content to test the Claude API
 * 2. Generate different format types (flashcards, quiz, outline, summary)
 * 3. Save the generated content to test files for review
 * 4. Show token usage and cost estimates
 */

// Note: This script requires the TypeScript to be compiled or run with ts-node
// For now, we'll create a simple wrapper that can work with the existing setup

const fs = require('fs');
const path = require('path');

// We'll import the ClaudeService dynamically to handle TypeScript
let ClaudeService;

async function loadClaudeService() {
  try {
    // Try to import the compiled JavaScript version
    const claudeModule = await import('./lib/claude-api.js');
    ClaudeService = claudeModule.ClaudeService;
  } catch (error) {
    console.log('⚠️  Could not load compiled ClaudeService. You may need to:');
    console.log('   1. Compile TypeScript: npx tsc');
    console.log('   2. Or use ts-node: npx ts-node test-content-generation.ts');
    console.log('   3. Or manually test through your web interface');
    console.log('\nFor now, you can manually test the optimized prompts through your web app.');
    process.exit(1);
  }
}

// Sample content similar to what you provided
const SAMPLE_MARINE_SCIENCE_CONTENT = `
# AICE Marine Science: Water Solubility

## Learning Objectives
By the end of this study session, you will be able to:
1. Define solubility and explain how it relates to marine environments
2. Identify factors that affect the solubility of substances in water
3. Compare solubility of different types of compounds in aquatic systems
4. Analyze the relationship between temperature and solubility in marine contexts
5. Apply solubility concepts to real-world marine science scenarios

## Key Concepts

### What is Solubility?
Solubility is the ability of a substance (solute) to dissolve in a solvent (like water) to form a homogeneous solution. In marine science, this determines what substances can dissolve in seawater and in what concentrations.

### "Like Dissolves Like" Principle
This fundamental principle means that polar substances dissolve well in polar solvents (like water), while nonpolar substances dissolve well in nonpolar solvents. Since water is polar, polar and ionic compounds dissolve well in seawater.

### Temperature Effects
For most solid solutes, solubility increases with temperature. Warmer ocean water can hold more dissolved substances than colder water. However, for gases (like oxygen), solubility decreases as temperature increases.

### Factors Affecting Solubility
The primary factors are:
- Temperature
- Pressure  
- Nature of the solute and solvent (polar vs. nonpolar)
- Presence of other dissolved substances

## Marine Applications

### Oxygen Solubility in Ocean Waters
Gas solubility decreases with increasing temperature. This is why cold polar waters have higher dissolved oxygen concentrations than warm tropical waters, affecting marine life distribution.

### Pressure Effects in Deep Waters
According to Henry's Law, gas solubility increases with pressure. Deep ocean waters under high pressure can hold more dissolved gases than surface waters.

### Salt and Ionic Compounds
Ionic compounds (like salts) and polar molecules are most soluble in seawater because water is a polar solvent. This explains why salts like sodium chloride dissolve readily in ocean water.

### Salting Out Effect
The high salt content in seawater can affect the solubility of other substances through the "salting out" effect, where dissolved salts can decrease the solubility of other compounds.

## Key Terms
- **Solubility**: The ability of a substance to dissolve in a solvent
- **Solute**: The substance being dissolved
- **Solvent**: The substance doing the dissolving (water in marine contexts)
- **Polar**: Having an uneven distribution of electrical charge
- **Nonpolar**: Having an even distribution of electrical charge
- **Henry's Law**: Gas solubility is proportional to pressure
- **Salting out**: Decreased solubility due to high salt concentration
`;

// Test configurations for different scenarios
const TEST_CONFIGS = [
  {
    name: 'flashcards_focused',
    format: 'flashcards',
    subject: 'AICE Marine Science',
    gradeLevel: '11th Grade',
    topicFocus: 'Water Solubility',
    difficultyLevel: 'intermediate',
    additionalInstructions: 'Focus ONLY on the provided content about water solubility. Generate 10-15 flashcards covering the key concepts mentioned in the source material.'
  },
  {
    name: 'quiz_comprehensive',
    format: 'quiz',
    subject: 'AICE Marine Science',
    gradeLevel: '11th Grade',
    topicFocus: 'Water Solubility',
    difficultyLevel: 'intermediate',
    additionalInstructions: 'Create questions ONLY about the concepts explicitly mentioned in the provided content. Include multiple choice, true/false, and short answer questions.'
  },
  {
    name: 'outline_structured',
    format: 'outline',
    subject: 'AICE Marine Science',
    gradeLevel: '11th Grade',
    topicFocus: 'Water Solubility',
    difficultyLevel: 'intermediate',
    additionalInstructions: 'Organize ONLY the provided content into a clear hierarchical outline with essential, important, and supporting sections.'
  },
  {
    name: 'summary_concise',
    format: 'summary',
    subject: 'AICE Marine Science',
    gradeLevel: '11th Grade',
    topicFocus: 'Water Solubility',
    difficultyLevel: 'intermediate',
    additionalInstructions: 'Summarize ONLY the provided content, focusing on the key relationships and concepts mentioned in the source material.'
  }
];

async function testContentGeneration() {
  console.log('🧪 Starting Content Generation Testing');
  console.log('=====================================\n');
  
  // Load the ClaudeService
  await loadClaudeService();
  
  // Create test output directory
  const outputDir = path.join(__dirname, 'test-outputs');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  const claudeService = new ClaudeService();
  const results = [];

  for (const config of TEST_CONFIGS) {
    console.log(`\n🔄 Testing: ${config.name}`);
    console.log(`Format: ${config.format}`);
    console.log(`Subject: ${config.subject}`);
    console.log(`Instructions: ${config.additionalInstructions}\n`);

    try {
      const startTime = Date.now();
      
      const response = await claudeService.generateStudyGuide({
        content: SAMPLE_MARINE_SCIENCE_CONTENT,
        subject: config.subject,
        gradeLevel: config.gradeLevel,
        format: config.format,
        topicFocus: config.topicFocus,
        difficultyLevel: config.difficultyLevel,
        additionalInstructions: config.additionalInstructions
      });

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      // Save the generated content
      const filename = `${config.name}_${Date.now()}.md`;
      const filepath = path.join(outputDir, filename);
      
      const fileContent = `# Test Results for ${config.name}
**Generated:** ${new Date().toISOString()}
**Duration:** ${duration}s
**Input Tokens:** ${response.usage.input_tokens}
**Output Tokens:** ${response.usage.output_tokens}
**Total Tokens:** ${response.usage.total_tokens}
**Estimated Cost:** $${(response.usage.total_tokens * 0.000015).toFixed(4)}

---

${response.content}
`;

      fs.writeFileSync(filepath, fileContent);

      // Store results for summary
      results.push({
        name: config.name,
        format: config.format,
        duration,
        usage: response.usage,
        filename,
        contentLength: response.content.length,
        // Count flashcards if it's a flashcard format
        flashcardCount: config.format === 'flashcards' ? 
          (response.content.match(/Q:/g) || []).length : null,
        // Count quiz questions if it's a quiz format
        quizQuestionCount: config.format === 'quiz' ? 
          ((response.content.match(/MC_QUESTION:/g) || []).length + 
           (response.content.match(/TF_QUESTION:/g) || []).length + 
           (response.content.match(/SA_QUESTION:/g) || []).length) : null
      });

      console.log(`✅ Generated successfully!`);
      console.log(`   Duration: ${duration}s`);
      console.log(`   Tokens: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);
      console.log(`   Cost: ~$${(response.usage.total_tokens * 0.000015).toFixed(4)}`);
      console.log(`   Content length: ${response.content.length} characters`);
      console.log(`   Saved to: ${filename}`);
      
      if (config.format === 'flashcards') {
        const flashcardCount = (response.content.match(/Q:/g) || []).length;
        console.log(`   Flashcards generated: ${flashcardCount}`);
      }
      
      if (config.format === 'quiz') {
        const mcCount = (response.content.match(/MC_QUESTION:/g) || []).length;
        const tfCount = (response.content.match(/TF_QUESTION:/g) || []).length;
        const saCount = (response.content.match(/SA_QUESTION:/g) || []).length;
        console.log(`   Quiz questions: ${mcCount} MC, ${tfCount} T/F, ${saCount} SA`);
      }

    } catch (error) {
      console.error(`❌ Error generating ${config.name}:`, error.message);
      results.push({
        name: config.name,
        format: config.format,
        error: error.message
      });
    }
  }

  // Generate summary report
  console.log('\n📊 SUMMARY REPORT');
  console.log('==================');
  
  let totalTokens = 0;
  let totalCost = 0;
  let totalDuration = 0;
  let successCount = 0;

  results.forEach(result => {
    if (!result.error) {
      successCount++;
      totalTokens += result.usage.total_tokens;
      totalCost += result.usage.total_tokens * 0.000015;
      totalDuration += result.duration;
      
      console.log(`\n${result.name}:`);
      console.log(`  ✅ Success - ${result.format}`);
      console.log(`  📄 Content: ${result.contentLength} chars`);
      console.log(`  🕐 Duration: ${result.duration}s`);
      console.log(`  💰 Cost: $${(result.usage.total_tokens * 0.000015).toFixed(4)}`);
      
      if (result.flashcardCount !== null) {
        console.log(`  🎴 Flashcards: ${result.flashcardCount}`);
      }
      if (result.quizQuestionCount !== null) {
        console.log(`  ❓ Quiz Questions: ${result.quizQuestionCount}`);
      }
    } else {
      console.log(`\n${result.name}:`);
      console.log(`  ❌ Failed: ${result.error}`);
    }
  });

  console.log(`\n📈 TOTALS:`);
  console.log(`  Successful tests: ${successCount}/${results.length}`);
  console.log(`  Total tokens used: ${totalTokens}`);
  console.log(`  Total cost: $${totalCost.toFixed(4)}`);
  console.log(`  Average duration: ${(totalDuration / successCount).toFixed(2)}s`);
  console.log(`  Output directory: ${outputDir}`);

  // Generate analysis file
  const analysisContent = `# Content Generation Test Analysis
Generated: ${new Date().toISOString()}

## Summary
- Tests run: ${results.length}
- Successful: ${successCount}
- Failed: ${results.length - successCount}
- Total tokens: ${totalTokens}
- Total cost: $${totalCost.toFixed(4)}

## Individual Results
${results.map(r => `
### ${r.name} (${r.format})
${r.error ? `❌ **FAILED**: ${r.error}` : `
✅ **SUCCESS**
- Duration: ${r.duration}s
- Tokens: ${r.usage.input_tokens} in, ${r.usage.output_tokens} out (${r.usage.total_tokens} total)
- Cost: $${(r.usage.total_tokens * 0.000015).toFixed(4)}
- Content length: ${r.contentLength} characters
${r.flashcardCount ? `- Flashcards: ${r.flashcardCount}` : ''}
${r.quizQuestionCount ? `- Quiz questions: ${r.quizQuestionCount}` : ''}
- File: ${r.filename}
`}
`).join('')}

## Recommendations
1. Review the generated content in the test-outputs folder
2. Check for consistency in flashcard and quiz question counts
3. Verify that content stays focused on provided material
4. Look for any external information that wasn't in the source
5. Compare different formats for quality and completeness

## Next Steps
- Adjust prompts based on the results
- Re-run tests with modified prompts
- Test with different content types
- Optimize for consistency and focus
`;

  fs.writeFileSync(path.join(outputDir, 'analysis.md'), analysisContent);
  console.log(`\n📋 Analysis saved to: ${path.join(outputDir, 'analysis.md')}`);
  console.log('\n🎉 Testing complete! Review the generated files to analyze the results.');
}

// Run the test if this file is executed directly
if (require.main === module) {
  testContentGeneration().catch(console.error);
}

module.exports = { testContentGeneration, SAMPLE_MARINE_SCIENCE_CONTENT, TEST_CONFIGS };
