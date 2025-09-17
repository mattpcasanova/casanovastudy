# Content Generation Testing Guide

This guide helps you test and optimize the Claude API content generation without creating PDFs or pushing changes.

## Quick Start

1. **Install ts-node if not already installed:**
   ```bash
   npm install
   ```

2. **Run the test script:**
   ```bash
   npm run test-content
   ```
   OR
   ```bash
   npx ts-node test-content-generation.ts
   ```

2. **Check the results:**
   - Generated content files will be saved in `test-outputs/` directory
   - Review `test-outputs/analysis.md` for a comprehensive summary
   - Each test generates a separate markdown file with the content and metadata

## What the Test Does

The test script:
- Uses sample marine science content (similar to your example)
- Tests all 4 formats: flashcards, quiz, outline, summary
- Measures token usage and costs
- Counts generated content (flashcards, quiz questions, etc.)
- Saves all results for manual review
- Generates a comprehensive analysis report

## Optimizations Made

### Content Focus Improvements
- **Stricter source-only rules**: Enhanced prompts to prevent external knowledge injection
- **Content verification**: Added explicit verification steps before including information
- **Topic expansion prevention**: Specific instructions to avoid related but unmentioned topics
- **Boundary enforcement**: Clear guidelines to work within source material limits

### Consistency Improvements
- **Mandatory quantities**: Specific requirements for flashcard counts (12-15) and quiz questions (10-12)
- **Comprehensive coverage**: Instructions to use ALL relevant source material
- **Balanced distribution**: Requirements for adequate content in each priority section
- **Format compliance**: Clear expectations for each format type

## Reviewing Results

### What to Look For

1. **Content Focus**:
   - ✅ All concepts come from the provided source material
   - ❌ No external marine science topics mentioned
   - ✅ Analogies only explain provided content, don't introduce new concepts

2. **Consistency**:
   - ✅ Flashcards: 10-15 cards generated
   - ✅ Quiz: 8-12 total questions with proper distribution
   - ✅ All priority sections (🔴 🟡 🟢) have substantial content
   - ✅ Learning objectives match source material coverage

3. **Quality**:
   - ✅ Content is comprehensive within source boundaries
   - ✅ Questions test knowledge explicitly from source
   - ✅ Proper formatting and structure

### Sample Analysis Questions
- Are there any concepts mentioned that weren't in the source material?
- Do the flashcard counts meet the 10-15 target range?
- Are the quiz questions distributed properly (5-6 MC, 3-4 T/F, 2-3 SA)?
- Do the learning objectives reflect only what's covered in the source?

## Iterating and Improving

1. **Review generated content** in `test-outputs/`
2. **Identify issues** in content focus or consistency
3. **Modify the prompt** in `lib/claude-api.ts`
4. **Re-run tests** to verify improvements
5. **Repeat** until satisfied with results

## Cost Tracking

The test script tracks:
- Token usage per test
- Estimated costs (approximately $0.000015 per token)
- Total cost for all tests
- Performance metrics (generation time)

## File Structure

```
test-outputs/
├── analysis.md                    # Comprehensive test summary
├── flashcards_focused_[timestamp].md
├── quiz_comprehensive_[timestamp].md
├── outline_structured_[timestamp].md
└── summary_concise_[timestamp].md
```

## Tips

- Run tests after each prompt modification
- Compare results across different test runs
- Focus on the specific issues you identified (content focus, consistency)
- Use the analysis file to track improvements over time
- Test with different sample content to ensure robustness

## Next Steps

Once you're satisfied with the test results:
1. The optimized prompts are already applied to your live system
2. Test with real PDF uploads through your web interface
3. Monitor actual usage for continued improvements
4. Clean up test files when no longer needed
