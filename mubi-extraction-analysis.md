# MUBI Data Extraction Analysis

## Key Findings from Structure Analysis

Based on analyzing three different films (Matt and Mara, Flow, Dìdi), here are the patterns and variations we discovered:

### Page Structure Variations

#### 1. **Synopsis Extraction**
**Consistent Pattern Found:**
- All films have `H2` with text "Synopsis" 
- The actual synopsis content is in a `<p>` tag that follows this heading
- Synopsis paragraphs have **no CSS classes** (empty class attribute)
- Synopsis text is typically 150-300 characters long

**Extraction Strategy:**
```javascript
// Look for H2 containing "Synopsis" and get the following paragraph
const synopsisH2 = document.querySelector('h2:contains("Synopsis")');
const synopsis = synopsisH2?.nextElementSibling?.textContent?.trim();
```

#### 2. **Film Title**
**Consistent Pattern:**
- Main title is in `H1` with class `css-1kpd5de e1d9yd024`
- Alternative/original title in `H2` with class `css-17fj2cc e1d9yd025`

#### 3. **Year and Country**
**Variation Found:**
- **Matt and Mara**: "Kazik Radwanski Canada, 2024" (director + country + year)
- **Flow**: "Gints Zilbalodis Latvia, France, 2024Animation, Fantasy, Adventure85Synopsis..." (mixed format)
- **Dìdi**: "Sean Wang United States, 2024Drama96Synopsis..." (mixed format)

**Issue:** The metadata is inconsistently formatted and sometimes runs together.

#### 4. **Director**
**Patterns:**
- Always in Cast & Crew section with format: "NameDirector, [Other Roles]"
- Also appears in the second H2 but mixed with other metadata

#### 5. **Runtime**
**Patterns:**
- Sometimes embedded in the metadata string
- Found "80 minutes" for Matt and Mara in body text
- Not consistently extractable from structured elements

#### 6. **Genres**
**Patterns:**
- Sometimes embedded in metadata strings
- Individual genre elements found: `drama (DIV.css-139sg3h e1d9yd0212)`
- Not always in dedicated elements

### Improved Extraction Strategy

Based on these findings, here's the recommended approach:

#### 1. **Reliable Extractions (High Confidence):**
```javascript
// Title - very consistent
const title = document.querySelector('h1.css-1kpd5de')?.textContent?.trim();

// Alternative title - consistent
const altTitle = document.querySelector('h2.css-17fj2cc')?.textContent?.trim();

// Synopsis - very consistent pattern
const synopsisH2 = Array.from(document.querySelectorAll('h2')).find(h => h.textContent.includes('Synopsis'));
const synopsis = synopsisH2?.nextElementSibling?.textContent?.trim();
```

#### 2. **Complex Extractions (Need Parsing):**
```javascript
// Director from Cast & Crew section (most reliable)
const directorElement = Array.from(document.querySelectorAll('h3')).find(h3 => 
  h3.textContent.includes('Director')
);
const director = directorElement?.textContent?.split('Director')[0]?.trim();

// Year from metadata H2 (requires regex)
const metadataH2 = document.querySelector('h2.css-17fj2cc');
const yearMatch = metadataH2?.textContent?.match(/\b(20\d{2})\b/);
const year = yearMatch ? yearMatch[1] : null;

// Runtime from body text (requires regex)
const bodyText = document.body.textContent;
const runtimeMatch = bodyText.match(/(\d{1,3})\s*(?:min|minutes)\b/i);
const runtime = runtimeMatch ? parseInt(runtimeMatch[1]) : null;
```

#### 3. **Problematic Extractions:**
- **Genres**: Very inconsistent, sometimes embedded in metadata strings
- **Country**: Mixed format with director and year
- **Streaming availability**: No clear pattern found

### Recommendations

1. **Use fallback strategies** for each piece of data
2. **Parse metadata strings** with regex for year, country, genres
3. **Focus on the most reliable patterns** (title, synopsis, director from cast section)
4. **Accept that some data may be missing** from certain films
5. **Implement validation** to check if extracted data makes sense

### Next Steps

1. Update the main scraper to use these reliable patterns
2. Add robust error handling for missing data
3. Implement fallback strategies for each data point
4. Add validation to check data quality before saving