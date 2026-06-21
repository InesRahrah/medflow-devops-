// =============================================================================
// CHATBOT FORMATTING TEST CASES
// =============================================================================
// 
// This file contains test cases that demonstrate all formatting features.
// Copy and paste these into the chat as AI responses to test the formatting.
// All formatting is applied automatically!

// =============================================================================
// TEST 1: TEXT FORMATTING (Bold, Italic, Code)
// =============================================================================
// Expected: Bold text in <strong>, italic in <em>, code in monospace

"This is **bold text** and this is *italic text*.

Use the `map()` function for transformation.

For complex code:
```const user = { name: 'John', age: 30 };```

Styling applied: Bold is darker, italic is slanted, code is different font."

// Expected Output:
// This is bold text (in bold) and this is italic text (in italics).
// Use the map() function for transformation. (in monospace font)
// Complex code displays with gray background and monospace font.

// =============================================================================
// TEST 2: BULLET POINTS
// =============================================================================
// Expected: Auto-converts to <ul> with <li> items

"Benefits of Aspirin:
- Reduces inflammation
- Relieves pain
- Prevents blood clots
- Protects heart health

These benefits make it a popular pain reliever."

// Expected Output:
// Benefits of Aspirin:
// • Reduces inflammation
// • Relieves pain
// • Prevents blood clots
// • Protects heart health

// =============================================================================
// TEST 3: NUMBERED LISTS
// =============================================================================
// Expected: Auto-converts to <ol> with numbered <li> items

"Steps to take medication:
1. Wash your hands
2. Take tablet from bottle
3. Drink a full glass of water
4. Take medication with food
5. Store in cool, dry place

Follow all steps for best results."

// Expected Output:
// Steps to take medication:
// 1. Wash your hands
// 2. Take tablet from bottle
// 3. Drink a full glass of water
// 4. Take medication with food
// 5. Store in cool, dry place

// =============================================================================
// TEST 4: SECTION TITLES (Auto-formatted with icons)
// =============================================================================
// Expected: Titles get icons 💊 📋 ⚠️ 📝 📌 ❗ 📊 with colors

"Drug: Aspirin

Dosage: 500mg every 4-6 hours

Side Effects: Stomach upset, heartburn, nausea

Warnings: Do not use if allergic to salicylates

Instructions: Take with food or milk

Notes: Stay well hydrated

Important: Consult physician if symptoms persist"

// Expected Output:
// 💊 Drug: Aspirin (blue and bold)
// 📋 Dosage: 500mg every 4-6 hours (green and bold)
// ⚠️ Side Effects: Stomach upset, heartburn, nausea (red and bold)
// ⚠️ Warnings: Do not use if allergic to salicylates (red and bold)
// 📝 Instructions: Take with food or milk (green and bold)
// 📌 Notes: Stay well hydrated (blue and bold)
// ❗ Important: Consult physician if symptoms persist (red and bold)

// =============================================================================
// TEST 5: COMPLETE MEDICATION INFORMATION
// =============================================================================
// Expected: All formatting features work together

"Drug: Acetaminophen
**Brand Name:** Tylenol
**Active Ingredient:** Acetaminophen 500mg

Indications:
- Fever reduction
- Pain relief
- General aches and pains

Dosage:
1. Adults: 325-650mg every 4-6 hours
2. Children: Based on weight (consult pharmacist)
3. Maximum daily: 3000-4000mg

Side Effects:
- Rare liver damage at high doses
- Allergic reactions (uncommon)
- Rash or itching

Warnings:
- Do not exceed recommended dose
- Avoid alcohol consumption
- Do not use with other acetaminophen products

Instructions:
- Take with full glass of water
- Do not crush or chew tablets
- Space doses 4-6 hours apart

Interactions:
Use caution with: \`alcohol\`, \`warfarin\`, \`phenothiazines\`

Results:
Fever typically decreases within 30-60 minutes
Pain relief usually felt within 1-2 hours

Important: **OVERDOSE IS DANGEROUS** - Seek immediate medical attention if overdose suspected"

// Expected Output:
// 💊 Drug: Acetaminophen
// Brand Name: Tylenol (bold)
// Active Ingredient: Acetaminophen 500mg (bold)
//
// Indications:
// • Fever reduction
// • Pain relief
// • General aches and pains
//
// 📋 Dosage:
// 1. Adults: 325-650mg every 4-6 hours
// 2. Children: Based on weight (consult pharmacist)
// 3. Maximum daily: 3000-4000mg
//
// ⚠️ Side Effects:
// • Rare liver damage at high doses
// • Allergic reactions (uncommon)
// • Rash or itching
//
// ⚠️ Warnings:
// • Do not exceed recommended dose
// • Avoid alcohol consumption
// • Do not use with other acetaminophen products
//
// 📝 Instructions:
// • Take with full glass of water
// • Do not crush or chew tablets
// • Space doses 4-6 hours apart
//
// Interactions:
// Use caution with: alcohol, warfarin, phenothiazines (in monospace)
//
// 📊 Results:
// Fever typically decreases within 30-60 minutes
// Pain relief usually felt within 1-2 hours
//
// ❗ Important: OVERDOSE IS DANGEROUS (bold) - Seek immediate medical attention if overdose suspected

// =============================================================================
// TEST 6: DRUG INTERACTION ALERT
// =============================================================================
// Expected: Warning formatting with emoji

"**DRUG INTERACTION ALERT** ⚠️

Primary Drug: Warfarin
**Interacting Drug:** Ibuprofen

Severity: **SEVERE** ⚠️

Mechanism:
Ibuprofen increases the anticoagulant effect of warfarin, increasing bleeding risk.

Risk Assessment:
1. Increased risk of bleeding
2. Gastrointestinal bleeding possible
3. Intracranial hemorrhage risk
4. Severe consequences possible

Symptoms to Watch:
- Black or tarry stools
- Vomiting blood
- Severe bruising
- Unusual bleeding from gums
- Blood in urine

Safe Alternatives:
1. Acetaminophen (Tylenol)
2. Acetaminophen-based products
3. Consult physician for other options

Management:
- Avoid ibuprofen completely
- Use alternative pain reliever
- Monitor INR levels regularly
- Report all medications to doctor

Important:
This combination should be avoided unless absolutely necessary under physician supervision."

// Expected Output:
// DRUG INTERACTION ALERT ⚠️ (warning styling)
// Primary Drug: Warfarin
// Interacting Drug: Ibuprofen (bold)
//
// 📋 Severity: SEVERE (bold and red)
//
// Mechanism:
// Ibuprofen increases the anticoagulant effect of warfarin, increasing bleeding risk.
//
// Risk Assessment:
// 1. Increased risk of bleeding
// 2. Gastrointestinal bleeding possible
// 3. Intracranial hemorrhage risk
// 4. Severe consequences possible
//
// Symptoms to Watch:
// • Black or tarry stools
// • Vomiting blood
// • Severe bruising
// • Unusual bleeding from gums
// • Blood in urine
//
// Safe Alternatives:
// 1. Acetaminophen (Tylenol)
// 2. Acetaminophen-based products
// 3. Consult physician for other options
//
// Management:
// • Avoid ibuprofen completely
// • Use alternative pain reliever
// • Monitor INR levels regularly
// • Report all medications to doctor
//
// ❗ Important: (red and bold)
// This combination should be avoided unless absolutely necessary under physician supervision.

// =============================================================================
// TEST 7: LABORATORY RESULTS
// =============================================================================
// Expected: Results formatted with proper structure

"Results: Complete Blood Count

Lab Values:
1. Hemoglobin: **12.2 g/dL** (Low - normal: 13.5-17.5)
2. Hematocrit: **36.8%** (Normal - normal: 40-55%)
3. White Blood Cells: **7.2 K/uL** (Normal - normal: 4.5-11.0)
4. Platelets: **245 K/uL** (Normal - normal: 150-400)

Analysis:
- Mild anemia indicated
- Other values within normal range
- Further testing may be needed

Recommendations:
- Increase dietary iron
- Consider iron supplementation
- Follow up testing in 4 weeks
- Consult physician for detailed advice

Notes:
Low hemoglobin may cause fatigue or shortness of breath

Important: These results are informational and require physician interpretation"

// Expected Output:
// 📊 Results: Complete Blood Count
//
// Lab Values:
// 1. Hemoglobin: 12.2 g/dL (Low - normal: 13.5-17.5) (bold value)
// 2. Hematocrit: 36.8% (Normal - normal: 40-55%) (bold value)
// 3. White Blood Cells: 7.2 K/uL (Normal - normal: 4.5-11.0) (bold value)
// 4. Platelets: 245 K/uL (Normal - normal: 150-400) (bold value)
//
// Analysis:
// • Mild anemia indicated
// • Other values within normal range
// • Further testing may be needed
//
// Recommendations:
// • Increase dietary iron
// • Consider iron supplementation
// • Follow up testing in 4 weeks
// • Consult physician for detailed advice
//
// 📌 Notes:
// Low hemoglobin may cause fatigue or shortness of breath
//
// ❗ Important:
// These results are informational and require physician interpretation

// =============================================================================
// TEST 8: DOSAGE CALCULATION
// =============================================================================
// Expected: Numbers and calculations properly formatted

"**Pediatric Dosage Calculation**

Patient Information:
Weight: 25 kg
Age: 7 years

Medication: Amoxicillin
Recommended Dose: 25-45 mg/kg/day

Calculation:
- Minimum dose: 25 × 25 kg = **625 mg/day**
- Maximum dose: 45 × 25 kg = **1,125 mg/day**
- Per dose (3x daily): **208-375 mg**
- Recommended: **250 mg three times daily**

Prescription Format:
\`Amoxicillin 250mg, 1 tablet PO TID\`

Administration:
1. Give by mouth
2. Space doses 6-8 hours apart
3. Complete full course
4. Do not skip doses

Monitoring:
- Watch for rash or allergic reaction
- Monitor for diarrhea or nausea
- Check for oral thrush

Important: Always verify with prescribing physician before administering"

// Expected Output:
// Pediatric Dosage Calculation (bold)
//
// Patient Information:
// Weight: 25 kg
// Age: 7 years
//
// 💊 Medication: Amoxicillin
// Recommended Dose: 25-45 mg/kg/day
//
// Calculation:
// • Minimum dose: 25 × 25 kg = 625 mg/day (bold)
// • Maximum dose: 45 × 25 kg = 1,125 mg/day (bold)
// • Per dose (3x daily): 208-375 mg (bold)
// • Recommended: 250 mg three times daily (bold)
//
// Prescription Format:
// Amoxicillin 250mg, 1 tablet PO TID (monospace font)
//
// 📝 Administration:
// 1. Give by mouth
// 2. Space doses 6-8 hours apart
// 3. Complete full course
// 4. Do not skip doses
//
// Monitoring:
// • Watch for rash or allergic reaction
// • Monitor for diarrhea or nausea
// • Check for oral thrush
//
// ❗ Important:
// Always verify with prescribing physician before administering

// =============================================================================
// FORMATTING RULES SUMMARY
// =============================================================================
//
// 1. BOLD TEXT
//    Format: **text**
//    Example: "This is **bold**"
//    Result: This is bold (in strong weight)
//
// 2. ITALIC TEXT
//    Format: *text*
//    Example: "This is *italic*"
//    Result: This is italic (in italic style)
//
// 3. INLINE CODE
//    Format: `code`
//    Example: "Use `Array.map()`"
//    Result: Use Array.map() (in monospace)
//
// 4. CODE BLOCK
//    Format: ```code```
//    Example: "```const x = 42;```"
//    Result: const x = 42; (gray background, monospace)
//
// 5. BULLET LIST
//    Format: - item (at start of line)
//    Example:
//      - First
//      - Second
//    Result: Formatted as <ul> list
//
// 6. NUMBERED LIST
//    Format: 1. item (at start of line)
//    Example:
//      1. First
//      2. Second
//    Result: Formatted as <ol> list
//
// 7. SECTION TITLES (Auto-formatted)
//    Drug:, Dosage:, Warnings:, Side Effects:,
//    Instructions:, Notes:, Important:, Results:
//    Each gets its own icon and color
//
// 8. LINE BREAKS
//    \n automatically converts to <br>
//
// =============================================================================
// TIPS FOR BEST RESULTS
// =============================================================================
//
// ✅ DO:
// - Use **bold** for emphasis
// - Use numbered lists for steps
// - Use bullet points for items
// - Write section titles exactly (with colon and space)
// - Include line breaks for spacing
// - Use clear formatting for readability
//
// ❌ DON'T:
// - Write "- item" without space after dash
// - Write "Drug:Aspirin" without space before text
// - Mix different markdown formats
// - Use overly complex nested formatting
// - Include HTML tags (they will be escaped)
// - Use more than one blank line
//
// =============================================================================
