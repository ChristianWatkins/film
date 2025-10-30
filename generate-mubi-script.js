const fs = require('fs');

// Extract found MUBI links and all arthaus film titles
function generateMubiLinksScript() {
  console.log('🎬 Generating complete arthaus film list with MUBI links...\n');
  
  // Load arthaus data to get all film titles
  const arthausData = JSON.parse(fs.readFileSync('./data/festivals/arthaus/2025.json', 'utf8'));
  
  // Load MUBI search results
  const mubiResults = JSON.parse(fs.readFileSync('./mubi-population-results.json', 'utf8'));
  
  // Extract found links
  const foundLinks = {};
  mubiResults.results.forEach(result => {
    if (result.status === 'found' && result.url) {
      foundLinks[result.film] = result.url;
    }
  });
  
  console.log(`📂 Found ${arthausData.length} arthaus films`);
  console.log(`🔗 Found ${Object.keys(foundLinks).length} MUBI links from previous search\n`);
  
  // Generate the script content
  let scriptContent = `const fs = require('fs');

/**
 * Helper script to manually add MUBI links to arthaus films
 * 
 * Usage:
 * 1. Edit the 'linksToAdd' object below with film titles and their MUBI URLs
 * 2. Run: node add-mubi-links.js
 */

// Add MUBI links here - format: "Film Title": "MUBI URL"
const linksToAdd = {
  // ✅ ALREADY FOUND LINKS (${Object.keys(foundLinks).length} films):
`;

  // Add found links
  Object.entries(foundLinks).forEach(([title, url]) => {
    scriptContent += `  "${title}": "${url}",\n`;
  });
  
  scriptContent += `
  // 📝 MANUALLY ADD MORE LINKS BELOW:
  // Copy film titles from the list below and add their MUBI URLs
  
`;

  // Add all films as comments for reference
  scriptContent += `  /*
  📋 ALL ARTHAUS FILMS (${arthausData.length} total):
  Copy any of these titles above and add their MUBI URLs
  
`;

  arthausData.forEach((film, index) => {
    const hasLink = foundLinks[film.title] ? ' ✅' : '';
    scriptContent += `  "${film.title}"${hasLink}\n`;
  });

  scriptContent += `  */
};

function addMubiLinks() {
  console.log('🎬 Adding MUBI links to arthaus films...\\n');
  
  // Load arthaus data
  const arthausPath = './data/festivals/arthaus/2025.json';
  const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
  
  console.log(\`📂 Loaded \${arthausData.length} arthaus films\`);
  console.log(\`🔗 Ready to add \${Object.keys(linksToAdd).length} MUBI links\\n\`);
  
  if (Object.keys(linksToAdd).length === 0) {
    console.log('⚠️  No links to add. Edit the linksToAdd object in this script first.');
    return;
  }
  
  let added = 0;
  let notFound = [];
  
  for (const [filmTitle, mubiUrl] of Object.entries(linksToAdd)) {
    const film = arthausData.find(f => f.title === filmTitle);
    
    if (film) {
      film.link = mubiUrl;
      added++;
      console.log(\`✅ Added link for: \${filmTitle}\`);
      console.log(\`   URL: \${mubiUrl}\`);
    } else {
      notFound.push(filmTitle);
      console.log(\`❌ Film not found: \${filmTitle}\`);
    }
  }
  
  if (notFound.length > 0) {
    console.log('\\n⚠️  Films not found:');
    notFound.forEach(title => console.log(\`   - \${title}\`));
    console.log('\\nDouble-check the titles match exactly.');
  }
  
  // Save updated data
  if (added > 0) {
    fs.writeFileSync(arthausPath, JSON.stringify(arthausData, null, 2));
    
    console.log('\\n🎉 Links added successfully!');
    console.log('='.repeat(50));
    console.log(\`🔗 Links added: \${added}\`);
    console.log(\`❌ Not found: \${notFound.length}\`);
    console.log(\`📄 Updated file: \${arthausPath}\`);
    console.log('\\n✅ MUBI buttons will now appear for films with links!');
  } else {
    console.log('\\n❌ No links were added.');
  }
}

addMubiLinks();`;

  // Write the new script
  fs.writeFileSync('./add-mubi-links.js', scriptContent);
  
  console.log('✅ Generated enhanced add-mubi-links.js script!');
  console.log('='.repeat(50));
  console.log(`🔗 Pre-filled with ${Object.keys(foundLinks).length} found MUBI links`);
  console.log(`📋 Includes all ${arthausData.length} arthaus films as reference`);
  console.log(`📄 File: ./add-mubi-links.js`);
  console.log('\n🚀 Ready to run: node add-mubi-links.js');
}

generateMubiLinksScript();