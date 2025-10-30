const fs = require('fs');

/**
 * Helper script to manually add MUBI links to arthaus films
 * 
 * Usage:
 * 1. Edit the 'linksToAdd' object below with film titles and their MUBI URLs
 * 2. Run: node add-mubi-links.js
 */

// Add MUBI links here - format: "Film Title": "MUBI URL"
const linksToAdd = {
  // ✅ ALREADY FOUND LINKS (14 films):
  "Amrum": "https://mubi.com/en/no/films/amrum",
  "Nouvelle Vague": "https://mubi.com/en/no/films/nouvelle-vague",
  "Sound of Falling": "https://mubi.com/en/no/films/sound-of-falling",
  "It Was Just an Accident": "https://mubi.com/en/no/films/it-was-just-an-accident",
  "Romería": "https://mubi.com/en/no/films/romeria",
  "Christy": "https://mubi.com/en/no/films/christy",
  "El jockey": "https://mubi.com/en/no/films/el-jockey",
  "Memoir of a Snail": "https://mubi.com/en/no/films/memoir-of-a-snail",
  "The Substance": "https://mubi.com/en/no/films/the-substance",
  "Black Dog": "https://mubi.com/en/no/films/black-dog",
  "Parthenope - Napolis skjønnhet": "https://mubi.com/en/no/films/parthenope",
  "SEX": "https://mubi.com/en/no/films/sex",
  "Perfect Days": "https://mubi.com/en/no/films/perfect-days",
  "The Sisters Brothers": "https://mubi.com/en/no/films/the-sisters-brothers",

  // 📝 REPLACE "LINK" WITH ACTUAL MUBI URLS:
  // Find each film on MUBI and replace "LINK" with the real URL
  
  // Films needing MUBI links (replace "LINK" with actual URLs):
  "Hind Rajabs stemme": "https://mubi.com/en/no/films/the-voice-of-hind-rajab",
  "Kveldsvakt": "https://mubi.com/en/no/films/late-shift-2025",
  "The Blue Trail": "https://mubi.com/en/no/films/the-other-side-of-the-sky",
  "Kjærlighet": "https://mubi.com/en/no/films/kjaerlighet-sex-drommer-kjaerlighet",
  "Ljósbrot": "https://mubi.com/en/no/films/when-the-light-breaks",
  "Drømmer": "https://mubi.com/en/no/films/dreams-2024",
  "Vermiglio – landsbyen mellom fjellene": "https://mubi.com/en/no/films/vermiglio-the-mountain-bride",
  "Vår Juliette": "https://mubi.com/en/no/films/juliette-in-spring",
  "En liten bit av kaken": "https://mubi.com/en/no/films/my-favourite-cake",
  "Kensukes hemmelige øy": "https://mubi.com/en/no/films/kensuke-s-kingdom",
  "Hør Her'a!": "https://mubi.com/en/no/films/listen-up",
  "Høstgule blader": "https://mubi.com/en/no/films/fallen-leaves-2023",
  "LUNDEFJELL - EGGET SOM FORSVANT": "https://mubi.com/en/no/films/puffin-rock-and-the-new-friends",
  "GUTTEN OG HEGREN": "https://mubi.com/en/no/films/how-do-you-live",
  "About Dry Grasses": "https://mubi.com/en/no/films/about-dry-grasses-2023",
  "Olfas døtre": "https://mubi.com/en/no/films/four-daughters-2023",
  "Tatt av tiden": "https://mubi.com/en/no/films/a-plein-temps",
  "How to Have Sex": "https://mubi.com/en/no/films/how-to-have-sex",
  "Rød Himmel": "https://mubi.com/en/no/films/afire",
  "Apolonia, Apolonia": "https://mubi.com/en/no/films/apolonia-apolonia",
  "After Yang": "https://mubi.com/en/no/films/after-yang",
  "Love Life": "https://mubi.com/en/no/films/love-life-2022",
  "Ingen bjørner": "https://mubi.com/en/no/films/no-bears",
  "Hvor er Anne Frank": "https://mubi.com/en/no/films/where-is-anne-frank",
  "Decision to Leave": "https://mubi.com/en/no/films/decision-to-leave",
  "Mor og sønn": "https://mubi.com/en/no/films/mother-and-son-2022",
  "Aftersun": "https://mubi.com/en/no/films/aftersun",
  "Ferskenlunden i Catalonia": "https://mubi.com/en/no/films/alcarras",
  "Ali & Ava": "https://mubi.com/en/no/films/ali-ava",
  "Close": "https://mubi.com/en/no/films/close-2022",
  "Natt i Paris": "https://mubi.com/en/no/films/my-night",
  "Drive My Car": "https://mubi.com/en/no/films/drive-my-car",
  "Drømmemannen": "https://mubi.com/en/no/films/i-m-your-man-2021",
  "Weathering with You": "https://mubi.com/en/no/films/weathering-with-you",
  "Evolution": "https://mubi.com/en/no/films/evolution-2021",
  "Veien videre": "https://mubi.com/en/no/films/hit-the-road-2021",
  "Et glass til": "https://mubi.com/en/no/films/druk",
  "Gunda": "https://mubi.com/en/no/films/gunda-2020",
  "Ninjababy": "https://mubi.com/en/no/films/ninjababy",
  "Memories of Murder": "https://mubi.com/en/no/films/memories-of-murder",
  "Ville vestens datter": "https://mubi.com/en/no/films/calamity-a-childhood-of-martha-jane-cannary",
  "Det finnes ingen djevel": "https://mubi.com/en/no/films/there-is-no-evil",
  "Ulvevandrerne": "https://mubi.com/en/no/films/wolfwalkers",
  "Quo vadis, Aida?": "https://mubi.com/en/no/films/quo-vadis-aida",
  "Rocks": "https://mubi.com/en/no/films/rocks-2019",
  "Billie": "https://mubi.com/en/no/films/billie-2019",
  "Undine": "https://mubi.com/en/no/films/undine-2020",
  "Spring Uje Spring": "https://mubi.com/en/no/films/uje",
  "I morgen danser vi": "https://mubi.com/en/no/films/and-then-we-danced",
  "Unge Ahmed": "https://mubi.com/en/no/films/ahmed",
  "Echo": "https://mubi.com/en/no/films/echo-2019",
  "Portrett av en kvinne i flammer": "https://mubi.com/en/no/films/portrait-de-la-jeune-fille-en-feu",
  "Parasitt": "https://mubi.com/en/no/films/parasite-2018",
  "The Farewell": "https://mubi.com/en/no/films/the-farewell-2019",
  "Monos": "https://mubi.com/en/no/films/monos",
  "Barn": "https://mubi.com/en/no/films/beware-of-children",
  "Atlantis": "https://mubi.com/en/no/films/atlantis-2019",
  "Godt nyttår, Chile": "https://mubi.com/en/no/films/too-late-to-die-young",
  "Mellom linjene": "https://mubi.com/en/no/films/non-fiction",
  "Lykkelige Lazzaro": "https://mubi.com/en/no/films/lazzaro-felice",
  "Amazing Grace": "https://mubi.com/en/no/films/amazing-grace-2018",
  "Woman at War": "https://mubi.com/en/no/films/woman-at-war",
  "Forført": "https://mubi.com/en/no/films/all-that-you-know",
  "Burning": "https://mubi.com/en/no/films/burning-2018",
  "mid90s": "https://mubi.com/en/no/films/mid-90s",
  "Den skyldige": "https://mubi.com/en/no/films/the-guilty-2018",
  "Capernaum": "https://mubi.com/en/no/films/capernaum",
  "Sorry to Bother You": "https://mubi.com/en/no/films/sorry-to-bother-you",
  "Amatører": "https://mubi.com/en/no/films/amateurs-2018",
  "Western": "https://mubi.com/en/no/films/western-2017",
  "Savnet": "https://mubi.com/en/no/films/loveless",
  "Om kropp og sjel": "https://mubi.com/en/no/films/on-body-and-soul",
  "The Insult": "https://mubi.com/en/no/films/the-insult",
  "Ut av intet": "https://mubi.com/en/no/films/in-the-fade",
  "Happy End": "https://mubi.com/en/no/films/happy-end-2017",
  "Gordon og Paddy – nøttemysteriet i skogen": "https://mubi.com/en/no/films/gordon-paddy",
  "Mannen mot strømmen": "https://mubi.com/en/no/films/dregs",
  "Den andre siden av håpet": "https://mubi.com/en/no/films/the-other-side-of-hope",
  "The Square": "https://mubi.com/en/no/films/the-square-2017",
  "120 slag i minuttet": "https://mubi.com/en/no/films/120-battements-par-minute",
  "Himmelen over Havanna": "https://mubi.com/en/no/films/return-to-ithaca",
  "Kammerpiken": "https://mubi.com/en/no/films/the-handmaiden",
  "Den store prøven": "https://mubi.com/en/no/films/graduation-2016",
  "Sommer 1993": "https://mubi.com/en/no/films/summer-1993-2017",
  "Min pappa Toni Erdmann": "https://mubi.com/en/no/films/toni-erdmann",
  "The Rules for Everything": "https://mubi.com/en/no/films/the-rules-for-everything",
  "Neruda": "https://mubi.com/en/no/films/neruda",
  "Your name.": "https://mubi.com/en/no/films/kimi-no-na-wa",
  "Kvinne, ukjent": "https://mubi.com/en/no/films/the-unknown-girl",
  "Phantom Boy": "https://mubi.com/en/no/films/phantom-boy",
  "Neon Bull": "https://mubi.com/en/no/films/neon-bull",
  "Under kirsebærtrærne": "https://mubi.com/en/no/films/sweet-red-bean-paste",
  "Havet brenner": "https://mubi.com/en/no/films/fire-at-sea",
  "24 uker": "https://mubi.com/en/no/films/24-weeks",
  "El Club": "https://mubi.com/en/no/films/the-club-2015",
  "Stabukker": "https://mubi.com/en/no/films/rams",
  "45 år": "https://mubi.com/en/no/films/45-years",
  "Min arabiske vår": "https://mubi.com/en/no/films/hedi",
  "A Perfect Day": "https://mubi.com/en/no/films/a-perfect-day-2015",
  "Dagen i går [Only Yesterday]": "https://mubi.com/en/no/films/only-yesterday",
  "Sauls sønn": "https://mubi.com/en/no/films/son-of-saul",
  "Heart of a Dog": "https://mubi.com/en/no/films/heart-of-a-dog-2015",
  "Taxi Teheran": "https://mubi.com/en/no/films/taxi-tehran",
  "Korsveien": "https://mubi.com/en/no/films/stations-of-the-cross",
  "EDEN": "https://mubi.com/en/no/films/eden-2014-mia-hansen-love",
  "En natt i Berlin": "https://mubi.com/en/no/films/victoria-2015",
  "Marnie - Min Hemmelige Venninne": "https://mubi.com/en/no/films/when-marnie-was-there",
  "Småfugler": "https://mubi.com/en/no/films/sparrows-2015",
  "Jordens salt": "https://mubi.com/en/no/films/the-salt-of-the-earth",
  "Vivianes kamp": "https://mubi.com/en/no/films/gett-the-trial-of-viviane-amsalem",
  "My Skinny Sister": "https://mubi.com/en/no/films/my-skinny-sister",
  "Still Life": "https://mubi.com/en/no/films/still-life-2013",
  "To dager, en natt": "https://mubi.com/en/no/films/two-days-one-night",z
  "Sangen fra havet": "https://mubi.com/en/no/films/song-of-the-sea-2014",
  "Fortellingen om Prinsesse Kaguya": "https://mubi.com/en/no/films/the-tale-of-princess-kaguya",
  "Phoenix": "https://mubi.com/en/no/films/phoenix-2014",
  "PRIDE": "https://mubi.com/en/no/films/pride-2014",
  "Det er meg du vil ha": "https://mubi.com/en/no/films/im-the-one-you-want",
  "Ida": "https://mubi.com/en/no/films/ida",
  "Ernest & Celestine": "https://mubi.com/en/no/films/ernest-and-celestine",
  "Som far, så sønn": "https://mubi.com/en/no/films/like-father-like-son-2013",
  "Turist": "https://mubi.com/en/no/films/force-majeure",
  "Raketten": "https://mubi.com/en/no/films/the-rocket-2013",
  "Fortiden": "https://mubi.com/en/no/films/the-past-2013",
  "Gjenforeningen": "https://mubi.com/en/no/films/the-reunion-2013",
  "Vinden stiger": "https://mubi.com/en/no/films/the-wind-rises",
  "Meg eier ingen": "https://mubi.com/en/no/films/nobody-owns-me",
  "Blå er den varmeste fargen": "https://mubi.com/en/no/films/blue-is-the-warmest-color",
  "Den grønne sykkelen": "https://mubi.com/en/no/films/wadjda",
  "Hannah Arendt": "https://mubi.com/en/no/films/hannah-arendt",
  "Stories We Tell": "https://mubi.com/en/no/films/stories-we-tell",
  "Frances Ha": "https://mubi.com/en/no/films/frances-ha",
  "Møte på Valmueåsen": "https://mubi.com/en/no/films/from-up-on-poppy-hill",
  "Rebellen [War Witch]": "https://mubi.com/en/no/films/war-witch",
  "Stem nei": "https://mubi.com/en/no/films/no-2012",
  "Amour": "https://mubi.com/en/no/films/amour-2012",
  "Rust og bein": "https://mubi.com/en/no/films/rust-and-bone",
  "SPISE SOVE DØ": "https://mubi.com/en/no/films/eat-sleep-die",
  "Arriettas hemmelige verden": "https://mubi.com/en/no/films/the-secret-world-of-arrietty",
  "Norwegian Wood": "https://mubi.com/en/no/films/norwegian-wood",
  "Nader og Simin – et brudd": "https://mubi.com/en/no/films/a-separation",
  "Pina": "https://mubi.com/en/no/films/pina",
  "Treet": "https://mubi.com/en/no/films/the-tree",
  "678 KAIRO": "https://mubi.com/en/no/films/cairo-678",
  "Soul Kitchen": "https://mubi.com/en/no/films/soul-kitchen",
  "Jordsjø-krønikene": "https://mubi.com/en/no/films/tales-from-earthsea",
  "Sommerlunsj i Roma": "https://mubi.com/en/no/films/mid-august-lunch",
  "The Secret Of Kells": "https://mubi.com/en/no/films/the-secret-of-kells",
  "Det hvite båndet": "https://mubi.com/en/no/films/the-white-ribbon",
  "Ponyo på klippen ved havet": "https://mubi.com/en/no/films/ponyo",
  "Pans labyrint": "https://mubi.com/en/no/films/pans-labyrinth",
  "Skjult": "https://mubi.com/en/no/films/hidden",
  "Det levende slottet": "https://mubi.com/en/no/films/howls-moving-castle",
  "Ulvetid": "https://mubi.com/en/no/films/time-of-the-wolf",
  "Chihiro og heksene": "https://mubi.com/en/no/films/spirited-away",
  "Katteprinsen": "https://mubi.com/en/no/films/the-cat-returns",
  "Barking Dogs Never Bite": "https://mubi.com/en/no/films/barking-dogs-never-bite",
  "Prinsesse Mononoke - IMAX og 4k": "https://mubi.com/en/no/films/princess-mononoke",
  "Naboene Yamada": "https://mubi.com/en/no/films/my-neighbors-the-yamadas",
  "Funny Games": "https://mubi.com/en/no/films/funny-games-us",
  "Slottet": "https://mubi.com/en/no/films/the-castle",
  "Whisper of the Heart": "https://mubi.com/en/no/films/whisper-of-the-heart",
  "Pompoko": "https://mubi.com/en/no/films/pom-poko",
  "Ocean Waves": "https://mubi.com/en/no/films/ocean-waves",
  "71 fragmenter av tilfeldighetens kronologi": "https://mubi.com/en/no/films/71-fragments-of-a-chronology-of-chance",
  "Bennys video": "https://mubi.com/en/no/films/bennys-video",
  "Porco Rosso": "https://mubi.com/en/no/films/porco-rosso",
  "Kikis budservice": "https://mubi.com/en/no/films/kikis-delivery-service",
  "Det sjuende kontinentet": "https://mubi.com/en/no/films/the-seventh-continent",
  "Min nabo Totoro": "https://mubi.com/en/no/films/my-neighbor-totoro",
  "Laputa - Himmelslottet": "https://mubi.com/en/no/films/castle-in-the-sky",
  "Nausicaä - prinsessen fra Vindens dal": "https://mubi.com/en/no/films/nausicaa-of-the-valley-of-the-wind",
  "Småen": "https://mubi.com/en/no/films/the-kid"

// 
};

function addMubiLinks() {
  console.log('🎬 Adding MUBI links to arthaus films...\n');
  
  // Load arthaus data
  const arthausPath = './data/festivals/arthaus/2025.json';
  const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
  
  console.log(`📂 Loaded ${arthausData.length} arthaus films`);
  
  const realLinks = Object.values(linksToAdd).filter(url => url !== "LINK").length;
  console.log(`🔗 Ready to add ${realLinks} MUBI links (${Object.keys(linksToAdd).length - realLinks} still need links)\n`);
  
  if (Object.keys(linksToAdd).length === 0) {
    console.log('⚠️  No links to add. Edit the linksToAdd object in this script first.');
    return;
  }
  
  let added = 0;
  let notFound = [];
  
  for (const [filmTitle, mubiUrl] of Object.entries(linksToAdd)) {
    // Skip films with "LINK" placeholder
    if (mubiUrl === "LINK") {
      continue;
    }
    
    const film = arthausData.find(f => f.title === filmTitle);
    
    if (film) {
      film.link = mubiUrl;
      added++;
      console.log(`✅ Added link for: ${filmTitle}`);
      console.log(`   URL: ${mubiUrl}`);
    } else {
      notFound.push(filmTitle);
      console.log(`❌ Film not found: ${filmTitle}`);
    }
  }
  
  if (notFound.length > 0) {
    console.log('\n⚠️  Films not found:');
    notFound.forEach(title => console.log(`   - ${title}`));
    console.log('\nDouble-check the titles match exactly.');
  }
  
  // Save updated data
  if (added > 0) {
    fs.writeFileSync(arthausPath, JSON.stringify(arthausData, null, 2));
    
    console.log('\n🎉 Links added successfully!');
    console.log('='.repeat(50));
    console.log(`🔗 Links added: ${added}`);
    console.log(`❌ Not found: ${notFound.length}`);
    console.log(`📄 Updated file: ${arthausPath}`);
    console.log('\n✅ MUBI buttons will now appear for films with links!');
  } else {
    console.log('\n❌ No links were added.');
  }
}

addMubiLinks();