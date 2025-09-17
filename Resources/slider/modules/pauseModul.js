import { getSessionInfo, fetchItemDetails, makeApiRequest } from "./api.js";
import { getConfig } from "./config.js";
import { getLanguageLabels, getDefaultLanguage } from '../language/index.js';

const config = getConfig();
const currentLang = config.defaultLanguage || getDefaultLanguage();
const labels = getLanguageLabels(currentLang) || {};
const imageBlobCache = new Map();
const TAG_MEM_TTL_MS = Math.max(
  0,
  Number(getConfig()?.pauseOverlay?.tagsCacheTtlMs ?? 6 * 60 * 60 * 1000)
);

let _tagsMemCache = { stamp: null, savedAt: 0, tags: null };
let ratingGenreTimeout = null;
let ratingGenreElement = null;
let currentMediaData = null;
let activeVideo = null;
let currentMediaId = null;
let removeHandlers = null;
let overlayVisible = false;
let lastIdCheck = 0;
let wasPaused = false;
let pauseTimeout = null;
let lastActivityAt = Date.now();
let blurAt = document.hasFocus() ? null : Date.now();
let hiddenAt = (document.visibilityState === 'hidden') ? Date.now() : null;
let lastPauseReason = null;
let lastPauseAt = 0;

if (!window.__jmsPauseOverlay) {
  window.__jmsPauseOverlay = { destroy: null, active: false };
}

function _mkLifecycle() {
  const lc = {
    abort: new AbortController(),
    timers: new Set(),
    rafId: null,
    observers: new Set(),
    cleans: new Set(),
  };
  const { signal } = lc.abort;
  lc.addTimeout  = (fn, ms) => { const id = setTimeout(fn, ms);  lc.timers.add({id,t:'t'}); return id; };
  lc.addInterval = (fn, ms) => { const id = setInterval(fn, ms); lc.timers.add({id,t:'i'}); return id; };
  lc.addRaf      = (fn)     => {
   if (lc.rafId != null) cancelAnimationFrame(lc.rafId);
   lc.rafId = requestAnimationFrame(fn);
   return lc.rafId;
 };
  lc.trackMo     = (mo)     => { lc.observers.add(mo); return mo; };
  lc.trackClean  = (fn)     => { if (typeof fn==='function') lc.cleans.add(fn); };
  lc.cleanupAll  = () => {
    try { lc.abort.abort(); } catch {}
    for (const x of lc.timers) x.t==='i' ? clearInterval(x.id) : clearTimeout(x.id);
    lc.timers.clear();
    if (lc.rafId != null) { cancelAnimationFrame(lc.rafId); lc.rafId = null; }
    for (const mo of lc.observers) { try { mo.disconnect(); } catch {} }
    lc.observers.clear();
    for (const fn of lc.cleans) { try { fn(); } catch {} }
    lc.cleans.clear();
  };
  lc.signal = signal;
  return lc;
}

function wipeBadgeStateAndDom() {
  try { if (ratingGenreTimeout) clearTimeout(ratingGenreTimeout); } catch {}
  ratingGenreTimeout = null;
  currentMediaData = null;
  if (ratingGenreElement && ratingGenreElement.parentNode) {
    ratingGenreElement.parentNode.removeChild(ratingGenreElement);
  }
  ratingGenreElement = null;
}

function hideRatingGenre(reason) {
  if (!ratingGenreElement) return;
  ratingGenreElement.classList.remove('visible');
  if (reason === 'auto' || reason === 'finished') {
    setTimeout(() => { wipeBadgeStateAndDom(); }, 360);
  }
}

function srcLooksLikeThemeVideo(videoEl){
  try {
    const s = String(videoEl?.currentSrc || videoEl?.src || '');
    if (!s) return false;
    return /(?:^|[\/_\-\?&=])theme(?:[\/_\-\.=&]|$)/i.test(s);
  } catch { return false; }
}

function isThemeItemName(item){
  if (!item) return false;
  const name = String(item.Name || item.OriginalTitle || '').toLowerCase();
  return name.includes('theme');
}

function shouldIgnoreTheme({ video=null, item=null }={}){
  if (video && srcLooksLikeThemeVideo(video)) return true;
  if (item && isThemeItemName(item)) return true;
  return false;
}

async function fetchFiltersFor(type) {
  const qs = new URLSearchParams({
    IncludeItemTypes: type,
    Recursive: 'true'
  });
  const res = await makeApiRequest(`/Items/Filters?${qs.toString()}`);
  return res || {};
}

function _computeStamp() {
  return [getApiBase(), getUserIdSafe() || ''].join('|');
}

async function loadCatalogTagsWithCache() {
  const stamp = _computeStamp();
  const now = Date.now();
  if (_tagsMemCache.tags &&
      _tagsMemCache.stamp === stamp &&
      (now - _tagsMemCache.savedAt) < TAG_MEM_TTL_MS) {
    return _tagsMemCache.tags;
  }

  const [movie, series] = await Promise.all([
    fetchFiltersFor('Movie'),
    fetchFiltersFor('Series')
  ]);

  const allTags = new Set([
    ...(movie?.Tags || []),
    ...(series?.Tags || [])
  ]);

  _tagsMemCache = { stamp, savedAt: now, tags: allTags };

  return allTags;
}

function normalizeAgeChip(rating) {
  if (!rating) return null;
  const r = String(rating).toUpperCase().trim().replace(/\s+/g,'').replace(/-/g,'');
  if (/(18\+|R18|ADULT|NC17|NC\-?17|XRATED|XXX|ADULTSONLY|AO|TR18|DE18|FSK18)/.test(r)) return "18+";
  if (/(17\+|^R$|TVMA|TR17)/.test(r)) return "17+";
  if (/(16\+|R16|^M$|MATURE|TR16|DE16|FSK16)/.test(r)) return "16+";
  if (/(15\+|TV15|TR15)/.test(r)) return "15+";
  if (/(13\+|TV14|PG13|PG\-?13|TEEN|TR13|DE12A?)/.test(r)) return "13+";
  if (/(12\+|TV12|TR12|DE12|FSK12)/.test(r)) return "12+";
  if (/(11\+|TR11)/.test(r)) return "11+";
  if (/(10\+|TVY10|TR10)/.test(r)) return "10+";
  if (/(9\+|TR9)/.test(r)) return "9+";
  if (/(7\+|TVY7|E10\+?|TR7|DE6|FSK6)/.test(r)) return "7+";
  if (/(G|^PG$|TVG|TVPG|E$|EVERYONE|U$|UC|UNIVERSAL|TR6|DE0|FSK0)/.test(r)) return "7+";
  if (/(ALLYEARS|ALLAGES|ALL|TVY|KIDS|^Y$|0\+|TR0)/.test(r)) return "0+";
  const m = r.match(/^(\d{1,2})\+?$/);
  if (m) return `${m[1]}+`;
  return r;
}

function normalizeAgeRating(raw) {
  if (!raw) return null;
  const s = String(raw).toUpperCase().replace(/\s+/g,'').replace(/-/g,'');
  if (/^TVMA$/.test(s)) return '18+';
  if (/^TV14$/.test(s)) return '14+';
  if (/^TVPG$/.test(s)) return '7+';
  if (/^TVG$/.test(s)) return 'Genel';
  if (s==='NC17') return '18+';
  if (s==='R') return '18+';
  if (s==='PG13') return '13+';
  if (s==='PG') return '7+';
  if (s==='G') return 'Genel';
  if (s==='18') return '18+';
  if (s==='15') return '15+';
  if (s==='12' || s==='12A') return '12+';
  if (s==='PG') return '7+';
  if (s==='U') return 'Genel';
  if (s==='FSK18') return '18+';
  if (s==='FSK16') return '16+';
  if (s==='FSK12') return '12+';
  if (s==='FSK6')  return '6+';
  if (s==='FSK0')  return 'Genel';
  const m = s.match(/^(\d{1,2})\+?$/);
  if (m) return `${m[1]}+`;
  return s;
}

function localizedMaturityHeader() {
  const lang = String(currentLang||'').toLowerCase();
  if (labels.maturityHeader) return labels.maturityHeader;
  if (lang.startsWith('eng')) return 'MATURITY RATING:';
  if (lang.startsWith('deu')) return 'ALTERSFREIGABE:';
  if (lang.startsWith('fre')) return 'CLASSIFICATION :';
  if (lang.startsWith('rus')) return 'ВОЗРАСТНОЕ ОГРАНИЧЕНИЕ:';
  return 'YETİŞKİNLİK DÜZEYİ:';
}

function localizedGenres(genres = []) {
  if (!Array.isArray(genres) || !genres.length) return [];
  const dict = labels?.turler || {};
  const lc = Object.fromEntries(Object.entries(dict).map(([k,v]) => [k.toLowerCase(), v]));
  return genres.map(g => dict[g] || lc[String(g).toLowerCase()] || g);
}

function descriptorLabel(code) {
  const dict = labels?.descriptors || {};
  const fallback = {
    violence: 'violence', sex: 'sexual content', nudity: 'nudity',
    horror: 'horror/thriller', drugs: 'drug use', profanity: 'strong language',
    crime: 'crime', war: 'war', discrimination: 'discrimination', mature: 'mature themes'
  };
  return dict[code] || fallback[code] || code;
}
function _escapeRe(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
function _buildRegex(words){
  if(!Array.isArray(words)||!words.length) return null;
  const pat = words.map(w=>_escapeRe(String(w))).join('|');
  return new RegExp(`\\b(${pat})\\b`,'i');
}

function _buildWordRx(words){
  if(!Array.isArray(words)||!words.length) return null;
  const pat = words.map(w=>_escapeRe(String(w.trim()))).join('|');
  return new RegExp(`(?:^|[^\\p{L}\\p{N}_])(?:${pat})(?=$|[^\\p{L}\\p{N}_])`,'iu');
}

function tokenIncludes(text, needles){
  if(!text) return false;
  const rx = _buildWordRx(needles);
  return !!(rx && rx.test(String(text)));
}

function countMatches(text, words){
  if(!text || !words?.length) return 0;
  const rx = _buildWordRx(words);
  if(!rx) return 0;
  let s = String(text), c = 0, m;
  while ((m = rx.exec(s))){ c++; s = s.slice(m.index + m[0].length); }
  return c;
}

function translateTag(tag) {
  if (!tag) return '';
  const t = String(tag).toLowerCase().trim();
  const dict =
    (labels && (labels.tagTranslations || labels.tags || labels.etiketler)) || {};
  return dict[tag] || dict[t] || tag;
}

function _normTag(s){
  return String(s||'').toLowerCase().trim();
}

function hasAny(tag, needles) {
  return tokenIncludes(tag || '', needles || []);
}

const BUCKETS = [
  { key: 'superhero', needles: [
    'superhero','super hero','superhuman','super human','super strength','super power','superpower',
    'super soldier','supervillain','super villain','masked vigilante','masked superhero',
    'symbiote','heroes','heroic','hero’s journey','hero\'s journey','teen superhero',
    'superhero team','teamup','team up','justice league','avengers','x-men','spider-man',
    'batman','superman','wonder woman','captain america','iron man','thor','venom',
    'female superhero','aging superhero','masked supervillain','s.h.i.e.l.d','marvel cinematic universe (mcu)',
    'dc universe (dcu)','dc extended universe (dceu)','sony’s spider-man universe','yrf spy universe'
  ]},

  { key: 'sci_fi_tech', needles: [
    'science and technology','sci-fi','sci fi','sci-fi horror','spaceship','spacecraft','space station','space war',
    'space battle','space opera','space western','space colony','space exploration','space mission','space travel',
    'android','cyborg','robot','mecha','humanoid robot','synthetic android',
    'artificial intelligence','artificial intelligence (a.i.)','a.i.','ai','nanotechnology','quantum mechanics',
    'time travel','time loop','time machine','time paradox','time warp','time freeze','temporal agent',
    'multiverse','alternate timeline','alternate universe','parallel universe','parallel world','wormhole',
    'terraforming','cryonics','hologram','telekinesis','telepathy','invisibility','virtual reality','vr','simulator',
    'simulation','simulated reality','mind control','mind reading','genetic engineering','genetic mutation','mutant','mutants',
    'first contact','extraterrestrial technology','nuclear','post-apocalyptic','future war','future noir','near future',
    'alien','alien invasion','alien race','alien planet','planet','planet mars','galaxy','cosmic','cosmology','spacewalk',
    'space walk','space probe','space vessel','spacecraft accident','spaceship crash','asteroid','meteor'
  ]},

  { key: 'horror', needles: [
    'horror','slasher','monster movie','creature feature','ghost','ghosts','haunted','haunting','haunted house','haunted mansion',
    'possession','demonic','demon','exorcism','evil spirits','evil doll','killer doll','voodoo','folk horror','revenge horror',
    'fear','nightmare','occult','ouija','religion and supernatural','supernatural horror','creepy doll','zombie','zombie apocalypse',
    'vampire','werewolf','mummy','nosferatu','ghoulish','gruesome','gore','low-budget horror','revenge slasher'
  ]},

  { key: 'monster', needles: [
    'monster','kaiju','godzilla','mothra','rodan','giant animal','giant ape','giant gorilla',
    'giant crocodile','giant snake','giant spider','giant worm','dinosaur','tyrannosaurus rex',
    'yeti','cyclops','giant insect','giant robot','monster island'
  ]},

  { key: 'war', needles: [
    'war','world war','world war i','world war ii','ww1','ww2','great war','warfare','battle','battlefield','frontline',
    'soldier','army','military','naval battle','naval warfare','air force','marine','u.s. marine','u.s. army','u.s. navy',
    'vietnam war','korean war (1950-53)','afghanistan war (2001-2021)','spanish civil war (1936-39)','pacific war',
    'civil war','american civil war','gallipoli campaign','battle of thermopylae','d-day','omaha beach','kamikaze',
    'war crimes','warlord','armageddon','save the world','resistance','guerrilla warfare','royal navy','royal air force'
  ]},

  { key: 'crime', needles: [
    'crime','criminal','crime boss','crime family','crime lord','underworld','organized crime','mafia','sicilian mafia',
    'yakuza','triad','cartel','drug cartel','mob','mob boss','gang','gangster','gang war','gang violence',
    'heist','bank heist','bank robbery','robbery','con artist','con man','scam','scammer','money laundering',
    'kidnapped','kidnapping','copycat killer','homicide','murder','murder mystery','murder investigation',
    'investigation','investigative journalism','investigative reporter','forensic','detective story',
    'police corruption','crooked cop','crooked politician','cover-up','prison break','jailbreak','prison escape',
    'hitman','assassin','vigilante justice','vigilantism','serial killer','sting operation', 'witness elimination'
  ]},

  { key: 'violence', needles: [
    'violence','violent','fight','fighting','combat','brawl','beat','beating','hand to hand combat',
    'gun','guns','gunfight','gun violence','shootout','shooting','sniper','sniper rifle','weapon','weapons',
    'knife','stabbing','stabbed','sword','swordsman','swordswoman','sword fight','sword battle','axe','sledgehammer',
    'explosion','explosions','blood','bloody','gore','decapitation','brutal','brutality',
    'martial arts','kung fu','karate','wing chun','underground fighting','torture','killing spree','massacre',
    'assault rifle','bomb','bombing','grenade','dynamite', 'security guard'
  ]},

  { key: 'sex', needles: [
    'sex','sexual','sexuality','sexual identity','sex scandal','sex offender','forbidden sexuality','intimate',
    'killed during sex','sex abuse','sexual abuse','sexual violence','pornographic video','orgy'
  ]},

  { key: 'nudity', needles: [
    'nudity','nude','full frontal','topless','nude swimming'
  ]},

  { key: 'profanity', needles: [
    'profanity','explicit language','strong language','vulgar'
  ]},

  { key: 'drugs', needles: [
    'drugs','drug','drug abuse','drug addiction','drug dealer','drug lord','drug trafficking','narcotics',
    'cocaine','heroin','meth','opium','marijuana','weed','nootropics','lsd'
  ]},

  { key: 'discrimination', needles: [
    'racism','sexism','homophobia','discrimination','hate speech','slur','antisemitism','islamophobia',
    'bigotry','class prejudice','caste system','apartheid'
  ]},

  { key: 'mature', needles: [
    'adult themes','abuse','domestic violence','suicide','suicide attempt','self harm','self-harm','trauma',
    'grief','intergenerational trauma','incest','rape','addiction','dysfunctional family',
    'bereavement','loss of loved one','child abuse','child molestation','pedophilia','mental illness'
  ]},

  { key: 'supernatural', needles: [
    'supernatural','supernatural power','supernatural phenomena','paranormal activity','spirit','spirits',
    'evil spell','sorcery','sorcerer','sorceress','witch','witch hunter','djinn',
    'demonic possession','curse','cursed','magical realism','magic spell'
  ]},

  { key: 'historical', needles: [
    'historical','historical drama','victorian era','renaissance','medieval','ancient greece','ancient rome',
    'ancient egypt','ottoman empire','byzantium','spanish second republic (1931-39)',
    'franco regime (francoism)','nazi germany','holocaust (shoah)','cold war','mccarthyism','biblical epic',
    'roman empire','greek mythology','egyptian mythology','italian renaissance','medieval france'
  ]},

  { key: 'fairytale', needles: [
    'fairy','fairy tale','fairytale','folk tale','folktale','fable',
    'princess','prince','kingdom','witch','enchantress','fairy godmother'
  ]},

  { key: 'fantasy_magic', needles: [
    'fantasy','dark fantasy','high fantasy','sword and sorcery','sword and sandal','fairy','fairy tale','fairytale',
    'modern fairy tale','myth','mythology','mythical creature','elves','dwarf','goblin','orc',
    'wizard','witch','enchantress','magical creature','magical object','legend','legendary hero',
    'dragons','griffin','mermaid','excalibur','arthurian mythology','talisman','spell','curse'
  ]},

  { key: 'thriller_suspense', needles: [
    'thriller','suspense','suspenseful','psychological thriller','conspiracy','conspiracy theory',
    'cat and mouse','stalker','stalking','home invasion','kidnapping','hostage','hostage situation','manhunt',
    'surveillance','surveillance camera','spy thriller','espionage','covert operation',
    'taunting','tension','tense'
  ]},

  { key: 'mystery_detective', needles: [
    'mystery','detective','detective inspector','detective couple','whodunit','clues','clue','investigation',
    'private detective','sherlock','sherlock holmes','noir','neo-noir','cold case','crime scene','locked room mystery'
  ]},

  { key: 'romance_love', needles: [
    'romance','romantic','romantic drama','romantic fantasy','romcom','love','love affair','love at first sight',
    'falling in love','tragic love','tragic romance','friends to lovers','forbidden love','everlasting love',
    'new beginning','wedding','honeymoon','imminent wedding'
  ]},

  { key: 'comedy_humor', needles: [
    'comedy','buddy comedy','satire','satirical','parody','spoof','mockumentary','slapstick comedy',
    'hilarious','witty','wisecrack humor','breaking the fourth wall','comedy of situation','screenlife comedy'
  ]},

  { key: 'drama_family', needles: [
    'drama','family','family drama','family relationships','family conflict',
    'mother daughter relationship','mother son relationship','father son relationship','father daughter relationship',
    'single mother','single father','coming of age','teenage life','teenage romance','grief','loss','friendship',
    'found family','chosen family','kids','childhood','parenting','siblings'
  ]},

  { key: 'action_adventure', needles: [
    'action','action adventure','action comedy','action thriller','adventure','expedition',
    'treasure','treasure hunt','quest','race against time','chase','car chase','police chase','parkour',
    'stunt','stuntman','free climbing','helicopter chase','scaling a building','one man army','one against many',
    'wilderness','desert','jungle','island','lost at sea','runaway'
  ]},

  { key: 'animation_kids', needles: [
    'animation','animated','cgi animation','3d animation','stop motion','claymation','pixar',
    'children cartoon','children’s adventure','kids','tween','family comedy','horror for children',
    'live action and animation','cgi-live action hybrid','cartoon','cartoon animal','talking animal','talking dog','talking cat'
  ]},

  { key: 'documentary_biopic', needles: [
    'documentary','biography','biographical','docudrama','based on true story','based on memoir or autobiography',
    'history and legacy','science documentary','behind the scenes'
  ]},

  { key: 'music_dance', needles: [
    'music','musical','jukebox musical','jazz','singer','singing','songwriter','concert','ballet','dance','dance performance',
    'flamenco','hip-hop','pop music','music critic'
  ]},

  { key: 'sports', needles: [
    'sports','boxing','boxing champion','boxing trainer','basketball player','football (soccer)','ufc','mma','karate',
    'martial arts tournament','sport climbing','race','grand prix','baseball'
  ]},

  { key: 'western', needles: [
    'western','outlaw','gunslinger','cowboy','wild west','spaghetti western','frontier','stagecoach'
  ]},

  { key: 'political', needles: [
    'political','politics','political thriller','political campaign','election','election campaign',
    'political assassination','political crisis','political intrigue','authoritarianism','totalitarian regime',
    'coup','resistance','senator','prime minister','president','the white house','washington dc, usa','usa politics'
  ]},

  { key: 'religion_myth', needles: [
    'religion','religious allegory','religious cult','religious satire','religious symbolism','faith',
    'christian','christianity','islam','judaism','hinduism','buddhism','shia','koran','bible','biblical epic',
    'norse mythology','messiah','prophecy','prophet'
  ]},

  { key: 'survival_disaster', needles: [
    'disaster','disaster movie','earthquake','flood','tsunami','hurricane','avalanche','volcano','pandemic',
    'outbreak','apocalypse','post-apocalyptic future','doomsday','end of the world','plague','famine','evacuation',
    'survival','survival at sea','trapped','trapped in space','trapped in an elevator','trying to avoid making noise'
  ]},

  { key: 'period_era', needles: [
    'ancient','ancient world','18th century','19th century','20th century','5th century bc','6th century',
    '10th century','12th century','15th century','1750s','1800s','1850s','1880s','1890s','1900s','1910s',
    '1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s','2000s','2030s','2040s','2050s','2060s','2090s',
    'near future','distant future','post world war ii','post war japan','eve of world war ii'
  ]},

  { key: 'travel_road', needles: [
    'road movie','road trip','journey','trip','travel','tour','tourism','around the world',
    'backpacker','explorer','expedition','trekking'
  ]},

  { key: 'animals_nature', needles: [
    'animal','animals','animal attack','bear','wolf','wolves','tiger','lion','shark','shark attack','crocodile','crocodile attack',
    'horse','dog','cat','elephant','dolphin','whale','humpback whale','seal (animal)','penguin','octopus','squid',
    'giraffe','zebra','panda','monkey','chimpanzee','gorilla','hippopotamus',
    'wildlife','endangered species','nature','forest','jungle','savannah'
  ]},
];

const NEGATIVE_WORDS = {
  fairytale: ['war','battle','soldier','army','frontline','sniper','bomb','grenade','blood','gore','massacre'],
  romance_love: ['battlefield','massacre','genocide'],
  animation_kids: ['explicit','gore','slasher','torture'],
  music_dance: ['massacre','battlefield'],
  documentary_biopic: ['space battle','wizard','dragon'],
};

const BUCKET_PRIORITY = [
  'war','crime','violence','horror','thriller_suspense','mystery_detective',
  'sci_fi_tech','fantasy_magic','supernatural',
  'historical','political','survival_disaster',
  'action_adventure','drama_family','romance_love','comedy_humor',
  'documentary_biopic','sports','music_dance','western',
  'animation_kids','animals_nature','travel_road','period_era','monster',
  'superhero','fairytale'
];


function buildAutoDescriptorTagMap(catalogTags) {
   const map = {};
   for (const b of BUCKETS) map[b.key] = [];

   for (const t of catalogTags) {
     for (const b of BUCKETS) {
      if (hasAny(t, b.needles)) {
         map[b.key].push(t);
       }
     }
   }
   return map;
 }

function getDescriptorTagMap() {
  if (labels?.descriptorTagMap && typeof labels.descriptorTagMap === 'object') {
    return labels.descriptorTagMap;
  }

  return {
    superhero: [
    'superhero','super hero','superhuman','super human','super strength','super power','superpower',
    'super soldier','supervillain','super villain','masked vigilante','masked superhero',
    'symbiote','heroes','heroic','hero’s journey','hero\'s journey','teen superhero',
    'superhero team','teamup','team up','justice league','avengers','x-men','spider-man',
    'batman','superman','wonder woman','captain america','iron man','thor','venom',
    'female superhero','aging superhero','masked supervillain','s.h.i.e.l.d','marvel cinematic universe (mcu)',
    'dc universe (dcu)','dc extended universe (dceu)','sony’s spider-man universe','yrf spy universe'
  ],

  sci_fi_tech: [
    'science and technology','sci-fi','sci fi','sci-fi horror','spaceship','spacecraft','space station','space war',
    'space battle','space opera','space western','space colony','space exploration','space mission','space travel',
    'android','cyborg','robot','mecha','humanoid robot','synthetic android',
    'artificial intelligence','artificial intelligence (a.i.)','a.i.','ai','nanotechnology','quantum mechanics',
    'time travel','time loop','time machine','time paradox','time warp','time freeze','temporal agent',
    'multiverse','alternate timeline','alternate universe','parallel universe','parallel world','wormhole',
    'terraforming','cryonics','hologram','telekinesis','telepathy','invisibility','virtual reality','vr','simulator',
    'simulation','simulated reality','mind control','mind reading','genetic engineering','genetic mutation','mutant','mutants',
    'first contact','extraterrestrial technology','nuclear','post-apocalyptic','future war','future noir','near future',
    'alien','alien invasion','alien race','alien planet','planet','planet mars','galaxy','cosmic','cosmology','spacewalk',
    'space walk','space probe','space vessel','spacecraft accident','spaceship crash','asteroid','meteor'
  ],

  horror: [
    'horror','slasher','monster movie','creature feature','ghost','ghosts','haunted','haunting','haunted house','haunted mansion',
    'possession','demonic','demon','exorcism','evil spirits','evil doll','killer doll','voodoo','folk horror','revenge horror',
    'fear','nightmare','occult','ouija','religion and supernatural','supernatural horror','creepy doll','zombie','zombie apocalypse',
    'vampire','werewolf','mummy','nosferatu','ghoulish','gruesome','gore','low-budget horror','revenge slasher'
  ],

  monster: [
    'monster','kaiju','godzilla','mothra','rodan','giant animal','giant ape','giant gorilla',
    'giant crocodile','giant snake','giant spider','giant worm','dinosaur','tyrannosaurus rex',
    'yeti','cyclops','giant insect','giant robot','monster island'
  ],

  war: [
    'war','world war','world war i','world war ii','ww1','ww2','great war','warfare','battle','battlefield','frontline',
    'soldier','army','military','naval battle','naval warfare','air force','marine','u.s. marine','u.s. army','u.s. navy',
    'vietnam war','korean war (1950-53)','afghanistan war (2001-2021)','spanish civil war (1936-39)','pacific war',
    'civil war','american civil war','gallipoli campaign','battle of thermopylae','d-day','omaha beach','kamikaze',
    'war crimes','warlord','armageddon','save the world','resistance','guerrilla warfare','royal navy','royal air force'
  ],

  crime: [
    'crime','criminal','crime boss','crime family','crime lord','underworld','organized crime','mafia','sicilian mafia',
    'yakuza','triad','cartel','drug cartel','mob','mob boss','gang','gangster','gang war','gang violence',
    'heist','bank heist','bank robbery','robbery','con artist','con man','scam','scammer','money laundering',
    'kidnapped','kidnapping','copycat killer','homicide','murder','murder mystery','murder investigation',
    'investigation','investigative journalism','investigative reporter','forensic','detective story',
    'police corruption','crooked cop','crooked politician','cover-up','prison break','jailbreak','prison escape',
    'hitman','assassin','vigilante justice','vigilantism','serial killer','sting operation','witness elimination'
  ],

  violence: [
    'violence','violent','fight','fighting','combat','brawl','beat','beating','hand to hand combat',
    'gun','guns','gunfight','gun violence','shootout','shooting','sniper','sniper rifle','weapon','weapons',
    'knife','stabbing','stabbed','sword','swordsman','swordswoman','sword fight','sword battle','axe','sledgehammer',
    'explosion','explosions','blood','bloody','gore','decapitation','brutal','brutality',
    'martial arts','kung fu','karate','wing chun','underground fighting','torture','killing spree','massacre',
    'assault rifle','bomb','bombing','grenade','dynamite','security guard'
  ],

  sex: [
    'sex','sexual','sexuality','sexual identity','sex scandal','sex offender','forbidden sexuality','intimate',
    'killed during sex','sex abuse','sexual abuse','sexual violence','pornographic video','orgy'
  ],

  nudity: [
    'nudity','nude','full frontal','topless','nude swimming'
  ],

  profanity: [
    'profanity','explicit language','strong language','vulgar'
  ],

  drugs: [
    'drugs','drug','drug abuse','drug addiction','drug dealer','drug lord','drug trafficking','narcotics',
    'cocaine','heroin','meth','opium','marijuana','weed','nootropics','lsd'
  ],

  discrimination: [
    'racism','sexism','homophobia','discrimination','hate speech','slur','antisemitism','islamophobia',
    'bigotry','class prejudice','caste system','apartheid'
  ],

  mature: [
    'adult themes','abuse','domestic violence','suicide','suicide attempt','self harm','self-harm','trauma',
    'grief','intergenerational trauma','incest','rape','addiction','dysfunctional family',
    'bereavement','loss of loved one','child abuse','child molestation','pedophilia','mental illness'
  ],

  supernatural: [
    'supernatural','supernatural power','supernatural phenomena','paranormal activity','spirit','spirits',
    'evil spell','sorcery','sorcerer','sorceress','witch','witch hunter','djinn',
    'demonic possession','curse','cursed','magical realism','magic spell'
  ],

  historical: [
    'historical','historical drama','victorian era','renaissance','medieval','ancient greece','ancient rome',
    'ancient egypt','ottoman empire','byzantium','spanish second republic (1931-39)',
    'franco regime (francoism)','nazi germany','holocaust (shoah)','cold war','mccarthyism','biblical epic',
    'roman empire','greek mythology','egyptian mythology','italian renaissance','medieval france'
  ],

  fantasy_magic: [
    'fantasy','dark fantasy','high fantasy','sword and sorcery','sword and sandal','fairy','fairy tale','fairytale',
    'modern fairy tale','myth','mythology','mythical creature','elves','dwarf','goblin','orc',
    'wizard','witch','enchantress','magical creature','magical object','legend','legendary hero',
    'dragons','griffin','mermaid','excalibur','arthurian mythology','talisman','spell','curse'
  ],

  thriller_suspense: [
    'thriller','suspense','suspenseful','psychological thriller','conspiracy','conspiracy theory',
    'cat and mouse','stalker','stalking','home invasion','kidnapping','hostage','hostage situation','manhunt',
    'surveillance','surveillance camera','spy thriller','espionage','covert operation',
    'taunting','tension','tense'
  ],

  mystery_detective: [
    'mystery','detective','detective inspector','detective couple','whodunit','clues','clue','investigation',
    'private detective','sherlock','sherlock holmes','noir','neo-noir','cold case','crime scene','locked room mystery'
  ],

  romance_love: [
    'romance','romantic','romantic drama','romantic fantasy','romcom','love','love affair','love at first sight',
    'falling in love','tragic love','tragic romance','friends to lovers','forbidden love','everlasting love',
    'new beginning','wedding','honeymoon','imminent wedding'
  ],

  comedy_humor: [
    'comedy','buddy comedy','satire','satirical','parody','spoof','mockumentary','slapstick comedy',
    'hilarious','witty','wisecrack humor','breaking the fourth wall','comedy of situation','screenlife comedy'
  ],

  drama_family: [
    'drama','family','family drama','family relationships','family conflict',
    'mother daughter relationship','mother son relationship','father son relationship','father daughter relationship',
    'single mother','single father','coming of age','teenage life','teenage romance','grief','loss','friendship',
    'found family','chosen family','kids','childhood','parenting','siblings'
  ],

  fairytale: [
    'based on cartoon','based on childrens book','based on novel or book'
  ],

  action_adventure: [
    'action','action adventure','action comedy','action thriller','adventure','expedition',
    'treasure','treasure hunt','quest','race against time','chase','car chase','police chase','parkour',
    'stunt','stuntman','free climbing','helicopter chase','scaling a building','one man army','one against many',
    'wilderness','desert','jungle','island','lost at sea','runaway'
  ],

  animation_kids: [
    'animation','animated','cgi animation','3d animation','stop motion','claymation','pixar',
    'children cartoon','children’s adventure','kids','tween','family comedy','horror for children',
    'live action and animation','cgi-live action hybrid','cartoon','cartoon animal','talking animal','talking dog','talking cat'
  ],

  documentary_biopic: [
    'documentary','biography','biographical','docudrama','based on true story','based on memoir or autobiography',
    'history and legacy','science documentary','behind the scenes'
  ],

  music_dance: [
    'music','musical','jukebox musical','jazz','singer','singing','songwriter','concert','ballet','dance','dance performance',
    'flamenco','hip-hop','pop music','music critic'
  ],

  sports: [
    'sports','boxing','boxing champion','boxing trainer','basketball player','football (soccer)','ufc','mma','karate',
    'martial arts tournament','sport climbing','race','grand prix','baseball'
  ],

  western: [
    'western','outlaw','gunslinger','cowboy','wild west','spaghetti western','frontier','stagecoach'
  ],

  political: [
    'political','politics','political thriller','political campaign','election','election campaign',
    'political assassination','political crisis','political intrigue','authoritarianism','totalitarian regime',
    'coup','resistance','senator','prime minister','president','the white house','washington dc, usa','usa politics'
  ],

  religion_myth: [
    'religion','religious allegory','religious cult','religious satire','religious symbolism','faith',
    'christian','christianity','islam','judaism','hinduism','buddhism','shia','koran','bible','biblical epic',
    'norse mythology','messiah','prophecy','prophet'
  ],

  survival_disaster: [
    'disaster','disaster movie','earthquake','flood','tsunami','hurricane','avalanche','volcano','pandemic',
    'outbreak','apocalypse','post-apocalyptic future','doomsday','end of the world','plague','famine','evacuation',
    'survival','survival at sea','trapped','trapped in space','trapped in an elevator','trying to avoid making noise'
  ],

  period_era: [
    'ancient','ancient world','18th century','19th century','20th century','5th century bc','6th century',
    '10th century','12th century','15th century','1750s','1800s','1850s','1880s','1890s','1900s','1910s',
    '1920s','1930s','1940s','1950s','1960s','1970s','1980s','1990s','2000s','2030s','2040s','2050s','2060s','2090s',
    'near future','distant future','post world war ii','post war japan','eve of world war ii'
  ],

  travel_road: [
    'road movie','road trip','journey','trip','travel','tour','tourism','around the world',
    'backpacker','explorer','expedition','trekking'
  ],

  animals_nature: [
    'animal','animals','animal attack','bear','wolf','wolves','tiger','lion','shark','shark attack','crocodile','crocodile attack',
    'horse','dog','cat','elephant','dolphin','whale','humpback whale','seal (animal)','penguin','octopus','squid',
    'giraffe','zebra','panda','monkey','chimpanzee','gorilla','hippopotamus',
    'wildlife','endangered species','nature','forest','jungle','savannah'
  ],
  };
}

function deriveTagDescriptors(item = {}) {
  const raw = (item.Tags || item.Keywords || []).filter(Boolean);
  if (!raw.length) return [];
  const tags = raw.map(_normTag);
  const map = getDescriptorTagMap();

  const scores = [];
  for (const [code, needles] of Object.entries(map)) {
    const inc = (needles || []).map(_normTag);
    let s = 0;
    for (const tg of tags) if (tokenIncludes(tg, inc)) s += 1;
    const neg = NEGATIVE_WORDS[code] || [];
    for (const tg of tags) if (tokenIncludes(tg, neg)) s -= 1.5;
    if (s>0) scores.push({ code, s });
  }

  if (!scores.length) return [];
  scores.sort((a,b)=>{
    if (b.s!==a.s) return b.s - a.s;
    return BUCKET_PRIORITY.indexOf(a.code) - BUCKET_PRIORITY.indexOf(b.code);
  });
  return scores.slice(0,2).map(x=>descriptorLabel(x.code));
}

function getDescriptorKeywordMap(){
  const k = labels?.descriptorKeywords;
  if (k && typeof k==='object') return k;
  return {
    violence: ['violence','violent','fight','combat','assault','brutal','blood','kavga','şiddet','savaş','silah','dövüş','gewalt','kampf','brutal'],
    sex: ['sexual','sex','erotic','intimate','explicit sex','cinsel','erotik','sexuell'],
    nudity: ['nudity','nude','çıplak','nacktheit'],
    horror: ['horror','thriller','slasher','gore','supernatural','paranormal','korku','gerilim','dehşet','übernatürlich'],
    drugs: ['drug','narcotic','cocaine','heroin','meth','substance abuse','uyuşturucu','esrar','eroin','kokain','drogen','rauschgift','alkol abuse'],
    profanity: ['strong language','explicit language','profanity','swear','vulgar','küfür','argo','schimpf','vulgär'],
    crime: ['crime','criminal','mafia','gang','heist','robbery','suç','mafya','soygun','krimi','verbrechen'],
    war: ['war','battle','army','military','conflict','front','savaş','ordu','asker','krieg','schlacht'],
    discrimination: ['racism','sexism','homophobia','discrimination','ayrımcılık','ırkçılık','cinsiyetçilik','diskriminierung'],
    mature: ['adult themes','abuse','suicide','self harm','trauma','domestic violence','istismar','intihar','travma','missbrauch','suizid']
  };
}

function deriveKeywordDescriptors(item = {}) {
  const overview = item.Overview || '';
  const taglines = (item.Taglines || []).join(' ') || '';
  const keysTags = (item.Keywords || item.Tags || []).join(' ') || '';
  const studios  = (item.Studios || []).map(s=>s?.Name||s).join(' ');
  const WEIGHTS = { overview:1.0, taglines:0.6, keystags:1.0, studios:0.3 };
  const dict = getDescriptorKeywordMap();

  const scores = [];
  for (const [code, words] of Object.entries(dict)) {
    let s = 0;
    s += WEIGHTS.overview * countMatches(overview, words);
    s += WEIGHTS.taglines * countMatches(taglines, words);
    s += WEIGHTS.keystags * countMatches(keysTags, words);
    s += WEIGHTS.studios  * countMatches(studios,  words);
    const neg = NEGATIVE_WORDS[code] || [];
    s -= 1.2 * countMatches(overview+' '+keysTags, neg);
    if (s>0.9) scores.push({ code, s });
  }
  if (!scores.length) return [];
  scores.sort((a,b)=>{
    if (b.s!==a.s) return b.s - a.s;
    return BUCKET_PRIORITY.indexOf(a.code) - BUCKET_PRIORITY.indexOf(b.code);
  });
  return scores.slice(0,2).map(x=>descriptorLabel(x.code));
}

export function setupPauseScreen() {
    const config = getConfig();
    const overlayConfig = config.pauseOverlay || { enabled: true };
    if (!overlayConfig.enabled) return () => {};

    try { if (window.__jmsPauseOverlay.destroy) window.__jmsPauseOverlay.destroy(); } catch {}
    if (window.__jmsPauseOverlay.active) return () => {};
    window.__jmsPauseOverlay.active = true;
    const LC = _mkLifecycle();
    const { signal } = LC;

    function wipeOverlayState() {
      resetContent();
      currentMediaId = null;
      currentMediaData = null;
    }

    async function initDescriptorTagsOnce() {
  try {
    if (labels && labels.descriptorTagMap && typeof labels.descriptorTagMap === 'object') {
      return;
    }
    const catalogTags = await loadCatalogTagsWithCache();
    const autoMap = buildAutoDescriptorTagMap(catalogTags);
    labels.descriptorTagMap = autoMap;
  } catch (e) {
    console.warn('descriptor tag map init hata:', e);
  }
}

  function isShortActiveVideo() {
  const v = activeVideo;
  if (!v) return false;
  const d = Number(v.duration || 0);
  return Number.isFinite(d) && d > 0 && d < 300;
}

    if (!document.getElementById('jms-pause-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'jms-pause-overlay';
        overlay.innerHTML = `
    <div class="pause-overlay-content">
        <div class="pause-left">
            <div id="jms-overlay-title" class="pause-title"></div>
            <div id="jms-overlay-metadata" class="pause-metadata"></div>
            <div id="jms-overlay-plot" class="pause-plot"></div>
    <div id="jms-overlay-recos" class="pause-recos">
        <div class="pause-recos-header" id="jms-recos-header"></div>
        <div class="pause-recos-row" id="jms-recos-row"></div>
    </div>
        </div>
    <div class="pause-right">
            <div class="pause-right-backdrop"></div>
            <div id="jms-overlay-logo" class="pause-logo-container"></div>
        </div>
    </div>
    <div class="pause-status-bottom-right" id="pause-status-bottom-right" style="display:none;">
        <span><i class="fa-jelly fa-regular fa-pause"></i> ${labels.paused || 'Duraklatıldı'}</span>
    </div>
`;
        document.body.appendChild(overlay);

        if (!document.getElementById('jms-pause-css')) {
            const link = document.createElement('link');
            link.id = 'jms-pause-css';
            link.rel = 'stylesheet';
            link.href = 'slider/src/pauseModul.css';
            document.head.appendChild(link);
        }
        if (!document.getElementById('jms-pause-extra-css')) {
            const style = document.createElement('style');
            style.id = 'jms-pause-extra-css';
            document.head.appendChild(style);
        }
    }

  function createRatingGenreElement() {
        if (!document.getElementById('jms-rating-genre-overlay')) {
            ratingGenreElement = document.createElement('div');
            ratingGenreElement.id = 'jms-rating-genre-overlay';
            ratingGenreElement.className = 'rating-genre-overlay';
            document.body.appendChild(ratingGenreElement);
            if (!document.getElementById('jms-rating-genre-css')) {
                const style = document.createElement('style');
                style.id = 'jms-rating-genre-css';
                style.textContent = `
                    .rating-genre-overlay {
                    position: fixed;
                    top: 75px;
                    left: 24px;
                    z-index: 9999;
                    pointer-events: none;
                   opacity: 0;
                    transform: translateY(-14px);
                    transition: transform .35s cubic-bezier(.2,.8,.4,1), opacity .35s ease;
                  }
                  .rating-genre-overlay.visible {
                    opacity: 1;
                    transform: translateY(0);
                  }
                  .rating-genre-card {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    color: #fff;
                    text-shadow: 0 1px 2px rgba(0,0,0,.6);
                  }
                  .rating-genre-card .bar {
                    width: 3px;
                    height: 44px;
                    background: #e10600;
                    border-radius: 2px;
                    flex: 0 0 3px;
                    margin-top: 2px;
                  }
                  .rating-genre-card .texts { line-height: 1.15; }
                  .rating-genre-card .line1 {
                    font-size: 22px;
                    font-weight: 800;
                    letter-spacing: .3px;
                    text-transform: uppercase;
                    opacity: .95;
                  }
                  .rating-genre-card .line2 {
                    margin-top: 4px;
                   font-size: 16px;
                    font-weight: 500;
                    opacity: .9;
                    text-transform: none;
                  }
                `;
                document.head.appendChild(style);
            }
        } else {
            ratingGenreElement = document.getElementById('jms-rating-genre-overlay');
        }
    }

async function showRatingGenre(itemData, duration = 10000) {
  if (!ratingGenreElement) createRatingGenreElement();
  if (ratingGenreTimeout) { clearTimeout(ratingGenreTimeout); ratingGenreTimeout = null; }
  let data = itemData;
  try {
    const isEpisode = data?.Type === 'Episode';
    const noTags = !Array.isArray(data?.Tags) || data.Tags.length === 0;
    const maybeSeriesId = data?.SeriesId || data?._episodeData?.SeriesId || null;

    const genresMissing = !Array.isArray(data?.Genres) || data.Genres.length === 0;
const ratingMissing = !data?.OfficialRating;
if (isEpisode && maybeSeriesId && (noTags || genresMissing || ratingMissing)) {
  const series = await fetchItemDetails(maybeSeriesId);
  const mergedTags = [
    ...(series?.Tags || []),
    ...(data?.Tags || []),
    ...(data?.Keywords || [])
  ].filter(Boolean);

  data = {
    ...series,
    ...data,
    Tags: Array.from(new Set(mergedTags)),
    Genres: genresMissing ? (series?.Genres || []) : data.Genres,
    OfficialRating: ratingMissing ? (series?.OfficialRating || data.OfficialRating) : data.OfficialRating
  };
}
  } catch (e) {  }

  const age = normalizeAgeChip(data?.OfficialRating);
  const locGenres = localizedGenres(data?.Genres || []);
  const descFromTags = deriveTagDescriptors(data);
  const descFromHeur = (!descFromTags.length && !locGenres.length)
    ? deriveKeywordDescriptors(data)
    : [];

  if (!age && descFromTags.length === 0 && locGenres.length === 0 && descFromHeur.length === 0) {
    hideRatingGenre(); return;
  }
  const line1 = age ? [localizedMaturityHeader(), age].join(' ') : '';
  const line2Arr = (descFromTags.length ? descFromTags.slice(0,2)
                    : (locGenres.length ? locGenres.slice(0,2)
                    : descFromHeur.slice(0,2)));
  const line2 = line2Arr.join(', ');

  if (line1 || line2) {
    ratingGenreElement.innerHTML = `
      <div class="rating-genre-card">
        <div class="bar"></div>
        <div class="texts">
          ${line1 ? `<div class="line1">${line1}</div>` : ''}
          ${line2 ? `<div class="line2">${line2}</div>` : ''}
        </div>
      </div>
    `;
    ratingGenreElement.classList.add('visible');
    ratingGenreTimeout = setTimeout(() => { hideRatingGenre('auto'); }, duration);
  }
}

    const overlayEl = document.getElementById('jms-pause-overlay');
    const titleEl = document.getElementById('jms-overlay-title');
    const metaEl = document.getElementById('jms-overlay-metadata');
    const plotEl = document.getElementById('jms-overlay-plot');
    const backdropEl = document.querySelector('.pause-right-backdrop');
    const logoEl = document.getElementById('jms-overlay-logo');
    const recosHeaderEl = document.getElementById('jms-recos-header');
    const pausedLabel = document.getElementById('pause-status-bottom-right');

    overlayEl.addEventListener('click', (e) => {
      if (!overlayVisible || !activeVideo) return;
      const content = overlayEl.querySelector('.pause-overlay-content');
      if (content && content.contains(e.target)) return;
      activeVideo.play();
      hideOverlay();
    });

    function renderIconOrEmoji(iconValue) {
      if (!iconValue) return '';
      if (iconValue.startsWith('fa-') || iconValue.includes('fa ')) {
        return `<i class="${iconValue}"></i>`;
      }
      return iconValue;
    }

    function setRecosHeader(isEpisodeContext) {
      if (!recosHeaderEl) return;
      if (isEpisodeContext) {
        const icon = renderIconOrEmoji(labels.unwatchedIcon || '📺');
        const text = labels.unwatchedEpisodes || 'İzlemediğiniz Bölümler';
        recosHeaderEl.innerHTML = `${icon} ${text}`;
      } else {
        const icon = renderIconOrEmoji(labels.recosIcon || '👍');
        const text = labels.youMayAlsoLike || 'Bunları da beğenebilirsiniz';
       recosHeaderEl.innerHTML = `${icon} ${text}`;
      }
    }

    function showOverlay() {
    overlayEl.classList.add('visible');
    overlayVisible = true;
    if(pausedLabel) {
        pausedLabel.style.display = 'flex';
        pausedLabel.style.opacity = '0';
        setTimeout(() => {
            pausedLabel.style.opacity = '0.92';
        }, 10);
    }

    const content = overlayEl.querySelector('.pause-overlay-content');
    if (content) {
        content.style.transform = 'translateY(10px)';
        content.style.opacity = '0';
        setTimeout(() => {
            content.style.transition = 'transform 0.4s cubic-bezier(0.2, 0.8, 0.4, 1), opacity 0.4s ease';
            content.style.transform = 'translateY(0)';
            content.style.opacity = '1';
        }, 10);
    }
}

function hideOverlay() {
  const content = overlayEl.querySelector('.pause-overlay-content');
  if (content) {
    content.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.6, 1), opacity 0.3s ease';
    content.style.transform = 'translateY(10px)';
    content.style.opacity = '0';
  }

  if (pausedLabel) {
    pausedLabel.style.opacity = '0';
    setTimeout(() => { pausedLabel.style.display = 'none'; }, 300);
  }

  setTimeout(() => {
    overlayEl.classList.remove('visible');
    overlayVisible = false;
    if (content) {
      content.style.transition = '';
      content.style.transform = '';
      content.style.opacity = '';
    }
    wipeOverlayState();
  }, 300);

  if (pauseTimeout) {
    clearTimeout(pauseTimeout);
    pauseTimeout = null;
  }
}


    function resetContent() {
        if (config.pauseOverlay.showBackdrop) {
            backdropEl.style.backgroundImage = 'none';
            backdropEl.style.opacity = '0';
        }
        if (config.pauseOverlay.showLogo) {
            logoEl.innerHTML = '';
        }
        titleEl.innerHTML = '';
        metaEl.innerHTML = '';
        plotEl.textContent = '';
        const recos = document.getElementById('jms-overlay-recos');
        const recosRow = document.getElementById('jms-recos-row');
        if (recos) recos.classList.remove('visible');
        if (recosRow) recosRow.innerHTML = '';
    }

    function convertTicks(ticks) {
        if (!ticks || isNaN(ticks)) return labels.sonucyok;
        const totalSeconds = ticks / 10000000;
        return formatTime(totalSeconds);
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return labels.sonucyok;
        const t = Math.floor(sec);
        const m = Math.floor(t / 60);
        const h = Math.floor(m / 60);
        const rm = m % 60;
        const rs = t % 60;
        return h > 0
            ? `${h}${labels.sa} ${rm}${labels.dk} ${rs}${labels.sn}`
            : `${rm}${labels.dk} ${rs}${labels.sn}`;
    }

    function genRow(label, value) {
        if (!value) return '';
        return `<div class="info-row"><span>${label}</span><span>${value}</span></div>`;
    }

    async function refreshData(data) {
      currentMediaData = data;
        resetContent();
        const ep = data._episodeData || null;
        if (config.pauseOverlay.showBackdrop) {
        await setBackdrop(data);
        } else {
            backdropEl.style.backgroundImage = 'none';
            backdropEl.style.opacity = '0';
        }
        if (config.pauseOverlay.showLogo) {
        await setLogo(data);
        } else {
            logoEl.innerHTML = '';
        }
        if (ep) {
    const seriesTitle = data.Name || data.OriginalTitle || '';
    const line = formatSeasonEpisodeLine(ep);

    titleEl.innerHTML = `
        <h1 class="pause-series-title">${seriesTitle}</h1>
        <h2 class="pause-episode-title">${line}</h2>
    `;
} else {
    titleEl.innerHTML = `<h1 class="pause-movie-title">${data.Name || data.OriginalTitle || ''}</h1>`;
}
        if (config.pauseOverlay.showMetadata) {
            const rows = [
                genRow('📅 ' + labels.showYearInfo, data.ProductionYear),
                genRow('⭐ ' + labels.showCommunityRating, data.CommunityRating ? Math.round(data.CommunityRating) + '/10' : ''),
                genRow('👨‍⚖️ ' + labels.showCriticRating, data.CriticRating ? Math.round(data.CriticRating) + '%' : ''),
                genRow('👥 ' + labels.voteCount, data.VoteCount),
                genRow('🔞 ' + labels.showOfficialRating, data.OfficialRating || labels.derecelendirmeyok),
                genRow('🎭 ' + labels.showGenresInfo, data.Genres?.slice(0,3).join(', ') || labels.noGenresFound),
                genRow('⏱️ ' + labels.showRuntimeInfo, convertTicks(ep?.RunTimeTicks || data.RunTimeTicks)),
                genRow('▶ ' + labels.currentTime, formatTime(activeVideo?.currentTime || 0)),
                genRow('⏳ ' + labels.remainingTime, formatTime((activeVideo?.duration || 0) - (activeVideo?.currentTime || 0)))
            ];
            metaEl.innerHTML = rows.join('');
        } else {
            metaEl.innerHTML = '';
        }
        if (config.pauseOverlay.showPlot) {
            plotEl.textContent = ep?.Overview || data.Overview || labels.konu + labels.noData;
        } else {
            plotEl.textContent = '';
        }
        setRecosHeader(Boolean(ep));
        try {
        let recs = [];
        if (ep) {
            recs = await fetchUnplayedEpisodesInSameSeason(ep, { limit: 5 });
        } else {
            recs = await fetchSimilarUnplayed(data, { limit: 5 });
        }
        renderRecommendations(recs);
        } catch (e) {
        console.warn('duraklatma ekranı tavsiye hatası:', e);
        setRecosHeader(Boolean(ep));
        renderRecommendations([]);
        }
    }

    if (!window.__jmsPauseOverlay._boundBeforeUnload) {
      window.addEventListener('beforeunload', () => {
        try { destroy(); } catch {}
      }, { signal });
      window.__jmsPauseOverlay._boundBeforeUnload = true;
    }

async function setBackdrop(item) {
   const tags = item?.BackdropImageTags || [];
   if (tags.length > 0) {
     const { accessToken } = getSessionInfo();
     const url = `/Items/${item.Id}/Images/Backdrop/0?tag=${encodeURIComponent(tags[0])}&maxWidth=1920&quality=90&api_key=${encodeURIComponent(accessToken || '')}`;
     backdropEl.style.backgroundImage = `url('${url}')`;
     backdropEl.style.opacity = '0.7';
   } else {
     backdropEl.style.backgroundImage = 'none';
     backdropEl.style.opacity = '0';
   }
 }

 async function setLogo(item) {
   if (!item) return;
   const imagePref = config.pauseOverlay?.imagePreference || 'auto';
   const hasLogoTag = item?.ImageTags?.Logo || item?.SeriesLogoImageTag || null;
   const hasDiscTag  = item?.ImageTags?.Disc || null;
   const { accessToken } = getSessionInfo();
    const logoUrl = hasLogoTag
   ? `/Items/${item.Id}/Images/Logo?tag=${encodeURIComponent(hasLogoTag)}&api_key=${encodeURIComponent(accessToken || '')}`
   : null;
    const discUrl = hasDiscTag
   ? `/Items/${item.Id}/Images/Disc?tag=${encodeURIComponent(hasDiscTag)}&api_key=${encodeURIComponent(accessToken || '')}`
   : null;

   const sequence = (() => {
     switch (imagePref) {
       case 'logo': return ['logo'];
       case 'disc': return ['disc'];
       case 'title': return ['title'];
       case 'logo-title': return ['logo', 'title'];
       case 'disc-logo-title': return ['disc', 'logo', 'title'];
       case 'disc-title': return ['disc', 'title'];
       case 'auto': default: return ['logo', 'disc', 'title'];
     }
   })();

   logoEl.innerHTML = '';
   for (const pref of sequence) {
     if (pref === 'logo' && logoUrl) {
       logoEl.innerHTML = `<div class="pause-logo-container"><img class="pause-logo" src="${logoUrl}" alt=""/></div>`;
       return;
     }
     if (pref === 'disc' && discUrl) {
       logoEl.innerHTML = `<div class="pause-disk-container"><img class="pause-disk" src="${discUrl}" alt=""/></div>`;
       return;
     }
     if (pref === 'title') {
       logoEl.innerHTML = `<div class="pause-text-logo">${item.Name || item.OriginalTitle || ''}</div>`;
       return;
     }
   }
   logoEl.innerHTML = `<div class="pause-text-logo">${item.Name || item.OriginalTitle || ''}</div>`;
 }

    function getPlayingItemIdFromVideo(video) {
  if (!video) return null;
  const src =
    video.currentSrc ||
    (video.querySelector && video.querySelector('source')?.src) ||
    video.src ||
    '';

  if (!src) return null;
  const m =
    src.match(/\/Videos\/([^/]+)\//) ||
    src.match(/[?&]ItemId=([^&]+)/) ||
    src.match(/\/Items\/([^/]+)\//) ||
    src.match(/\/videos\/([^/]+)\/[^?]+\.m3u8/i) ||
    src.match(/[?&](?:Id|ItemID)=([^&]+)/i);

  return m ? m[1] : null;
}
    async function resolveNowPlayingEpisode() {
    try {
        const session = await getSessionInfo();
        const np = session?.NowPlayingItem;
        if (!np) return null;
        if (np.Type === 'Episode') {
            const ep = await fetchItemDetails(np.Id);
            return ep;
        }
        return null;
    } catch {
        return null;
    }
}

    async function resolveNowPlaying() {
    try {
        const session = await getSessionInfo();
        const np = session?.NowPlayingItem;
        if (!np) return null;
        if (np.Type === 'Episode') {
            const ep = await fetchItemDetails(np.Id);
            const seriesId = np.SeriesId || ep.SeriesId;
            return { seriesId, episode: ep };
        }
        return {
            seriesId: np.SeriesId || np.Id,
            episode: null
        };
    } catch {
        return null;
    }
}

    function getCurrentMediaId(force = false) {
    const now = Date.now();
    if (!force && now - lastIdCheck < 500) return currentMediaId;
    lastIdCheck = now;

    const selectors = [
        '[data-id].btnUserRating',
        '[data-id].itemRatingButton',
        'button[data-id][data-isfavorite]',
        '.nowPlayingInfo[data-id]',
        '.detailPagePrimaryContainer[data-id]',
        '[data-itemid]',
        '.libraryPage[data-id]',
        '.itemBackdrop[data-id]'
    ];

    for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el?.dataset.id) return el.dataset.id;
        if (el?.dataset.itemid) return el.dataset.itemid;
    }
    try {
        const u = new URL(location.href);
        const qid = u.searchParams.get('id');
        if (qid) return qid;
    } catch {}

    return null;
}

    function isStudioHubsVideo(video) {
        return video.closest('#studio-hubs, .hub-card, .hub-row, .hub-video') !== null;
    }

    function isStudioTrailerPopoverVideo(video) {
    return video.closest('.mini-trailer-popover') !== null ||
           video.parentElement?.classList?.contains('mtp-player') ||
           video.closest('.mtp-inner') !== null ||
           video.classList.contains('studio-trailer-video') ||
           (video.tagName === 'IFRAME' && video.classList.contains('studio-trailer-iframe'));
}

function clearOverlayUi() {
  hideOverlay();
  resetContent();
  currentMediaId = null;
  try { hideRatingGenre('finished'); } catch {}
}

function bindVideo(video) {
  if (isStudioHubsVideo(video) || isStudioTrailerPopoverVideo(video)) return;
  if (shouldIgnoreTheme({ video })) return;
  if (removeHandlers) removeHandlers();
  if (video.closest('.video-preview-modal, .intro-video-container')) return;

  activeVideo = video;

  let playSeq = 0;
  let lastShownItemId = null;
  let stableSrcId = null;
  let lastSrcSig  = null;
  let armTimer = null;
  let badgeAttempts = 0;
  let srcAttrMo = null;
  let cleanupSmart = null;

  const ALLOWED_TYPES = new Set(['Movie', 'Episode']);
  const BADGE_MIN_CT_SEC = 1.2;
  const BADGE_MIN_DURATION_SEC = 300;
  const BADGE_MAX_ATTEMPTS = 10;

  function computeSrcSig(el = video) {
    try {
      const cur = String(el.currentSrc || el.src || '');
      const d = Number.isFinite(el.duration) ? (el.duration|0) : -1;
      return `${cur}::${d}`;
    } catch { return ''; }
  }

  function watchSrcAttr(el = video) {
  if (srcAttrMo) { try { srcAttrMo.disconnect(); } catch {} }
  srcAttrMo = new MutationObserver(() => {
    const sigNow = computeSrcSig(el);
    if (sigNow && sigNow !== lastSrcSig) {
      hardResetBadgeState();
      lastSrcSig  = sigNow;
      stableSrcId = getPlayingItemIdFromVideo(el) || stableSrcId;
      clearOverlayUi();
    }
  });
  srcAttrMo.observe(el, { attributes: true, attributeFilter: ['src'], childList: true, subtree: false });
  const source = el.querySelector('source');
  if (source) {
    srcAttrMo.observe(source, { attributes: true, attributeFilter: ['src'] });
  }
}

  function cancelArm() {
    if (armTimer) { clearTimeout(armTimer); armTimer = null; }
    try { video.removeEventListener('timeupdate', onTimeUpdateArm); } catch {}
  }

  function hardResetBadgeState() {
  hideRatingGenre();
  currentMediaData = null;
  lastShownItemId = null;
  badgeAttempts = 0;
  ++playSeq;
  cancelArm();
  wipeOverlayState();
}

async function resolveBySrcPrefer() {
    const ALLOWED_TYPES = new Set(['Movie', 'Episode']);
    try {
      const srcId = getPlayingItemIdFromVideo(activeVideo);
      if (srcId) {
        const det = await fetchItemDetails(srcId);
        if (det?.Type && ALLOWED_TYPES.has(det.Type)) {
          return { item: det, source: 'src' };
        }
      }
    } catch {}
    try {
      const domId = getCurrentMediaId(true);
      if (domId) {
        const det = await fetchItemDetails(domId);
        if (det?.Type && ALLOWED_TYPES.has(det.Type)) {
          return { item: det, source: 'dom' };
        }
      }
    } catch {}
    for (let i = 0; i < 6; i++) {
      try {
        const session = await getSessionInfo();
        const np = session?.NowPlayingItem;
        if (np?.Id && ALLOWED_TYPES.has(np.Type)) {
          const det = await fetchItemDetails(np.Id);
          if (det) return { item: det, source: 'session' };
        }
      } catch {}
      await new Promise(r => setTimeout(r, 120));
    }
    return { item: null, source: 'none' };
  }

  function shouldSuppressByDuration() {
    const dur = Number(video.duration || 0);
    if (!isFinite(dur) || dur === 0) return true;
    return dur < BADGE_MIN_DURATION_SEC;
  }

  async function onTimeUpdateArm() {
    if ((video.currentTime || 0) < BADGE_MIN_CT_SEC) return;
    if (shouldSuppressByDuration()) return;
    const shown = await showBadgeForCurrentIfFresh();
    if (shown || (++badgeAttempts >= BADGE_MAX_ATTEMPTS)) {
      cancelArm();
    }
   }

  async function showBadgeForCurrentIfFresh() {
    const seq = playSeq;
    if (shouldSuppressByDuration()) return;

   const { item, source } = await resolveBySrcPrefer();
   const data = item;
    if (!data) return false;
    if (shouldIgnoreTheme({ video: activeVideo, item: data })) return false;
    if (seq !== playSeq) return;
    if (!data) return false;

    const vidId = getPlayingItemIdFromVideo(activeVideo);
    if (vidId && data.Id !== vidId && source !== 'session') {
      return false;
    }

    if (lastShownItemId === data.Id) return true;

    currentMediaData = data;
    lastShownItemId = data.Id;
    await showRatingGenre(currentMediaData, 4000);
    return true;
  }

  const onPause = async () => {
    hideRatingGenre();
    if (video.ended) {
      hideOverlay();
      if (pausedLabel) { pausedLabel.style.opacity = '0'; pausedLabel.style.display = 'none'; }
      return;
    }
    if (pauseTimeout) clearTimeout(pauseTimeout);
  pauseTimeout = setTimeout(async () => {
  const seqAtSchedule = playSeq;
  if (!video.paused || video.ended) return;
  if (shouldSuppressByDuration()) return;
  let baseInfo = null;
  const vidItemId = getPlayingItemIdFromVideo(activeVideo);
  if (vidItemId) {
    try { baseInfo = await fetchItemDetails(vidItemId); } catch {}
  }

  let ep = (baseInfo?.Type === 'Episode') ? baseInfo : null;
  if (!ep) {
    try {
      const maybe = await resolveNowPlayingEpisode();
      if (maybe?.Id) ep = maybe;
    } catch {}
  }

  if (shouldIgnoreTheme({ video, item: ep || baseInfo })) return;

  if (!baseInfo) {
    const domId =
      document.querySelector('.nowPlayingInfo[data-id]')?.dataset?.id ||
      getCurrentMediaId(true);
    if (domId) {
      try { baseInfo = await fetchItemDetails(domId); } catch {}
    }
  }

  let seriesId =
    ep?.SeriesId ||
    baseInfo?.SeriesId ||
    baseInfo?.Id ||
    null;

  if (seqAtSchedule !== playSeq) return;
  if (!seriesId) return;

  currentMediaId = seriesId;
  const series = await fetchItemDetails(seriesId);
  if (seqAtSchedule !== playSeq || !video.paused || video.ended) return;

  if (shouldIgnoreTheme({ video, item: series })) return;

  await refreshData({ ...series, _episodeData: ep || null });
  showOverlay();
  if (!ep) {
    let tries = 3;
    while (tries-- > 0) {
      await new Promise(r => setTimeout(r, 200));
      const lateEp = await resolveNowPlayingEpisode();
      if (lateEp?.SeriesId === seriesId) {
        if (seqAtSchedule !== playSeq || !video.paused || video.ended) return;
        await refreshData({ ...series, _episodeData: lateEp });
        break;
      }
    }
  }
}, 1000);
  };

  const onPlay = async () => {
  const vidIdNow = getPlayingItemIdFromVideo(video);
  const sigNow   = computeSrcSig(video);
  const looksNew =
    (vidIdNow && stableSrcId && vidIdNow !== stableSrcId) ||
    (sigNow && lastSrcSig && sigNow !== lastSrcSig) ||
    (!stableSrcId && !!vidIdNow);

  if (looksNew) {
    hardResetBadgeState();
    stableSrcId = vidIdNow || stableSrcId;
    lastSrcSig  = sigNow   || lastSrcSig;
  }

  clearOverlayUi();

  if (pauseTimeout) clearTimeout(pauseTimeout);
  hardResetBadgeState();
  video.addEventListener('timeupdate', onTimeUpdateArm, { passive: true });
  armTimer = setTimeout(onTimeUpdateArm, 800);
};

  const onLoadedMetadata = async () => {
  hideRatingGenre('finished');
  currentMediaData = null;
  badgeAttempts = 0;

  const vidIdNow = getPlayingItemIdFromVideo(video);
  const sigNow   = computeSrcSig(video);

  const isNewMedia =
    (vidIdNow && stableSrcId && vidIdNow !== stableSrcId) ||
    (sigNow && lastSrcSig && sigNow !== lastSrcSig) ||
    (!stableSrcId && !!vidIdNow);

  if (isNewMedia) {
    hardResetBadgeState();
  }

  if (vidIdNow) stableSrcId = vidIdNow;
  if (sigNow)   lastSrcSig  = sigNow;

  clearOverlayUi();
};

  const onEnded = () => {
    hardResetBadgeState();
    hideRatingGenre('finished');
    hideOverlay();
    if (pausedLabel) { pausedLabel.style.opacity = '0'; pausedLabel.style.display = 'none'; }
  };
  const onEmptiedLike = () => {
  hardResetBadgeState();
  hideRatingGenre('finished');
  badgeAttempts = 0;
  clearOverlayUi();
};
  const onSeekingHide = () => {
  hideRatingGenre();
};

  video.addEventListener('pause', onPause, { signal });
  video.addEventListener('play', onPlay, { signal });
  video.addEventListener('loadedmetadata', onLoadedMetadata, { signal });
  video.addEventListener('loadstart', onLoadedMetadata, { signal });
  video.addEventListener('durationchange', onLoadedMetadata, { signal });
  video.addEventListener('playing', onPlay, { signal });
  video.addEventListener('ended', onEnded, { signal });
  video.addEventListener('emptied', onEmptiedLike, { signal });
  video.addEventListener('abort', onEmptiedLike, { signal });
  video.addEventListener('stalled', onEmptiedLike, { signal });
  video.addEventListener('seeking', onSeekingHide, { signal });
  try { cleanupSmart = createSmartAutoPause(video); } catch {}
  try { watchSrcAttr(video); } catch {}

  removeHandlers = () => {
    video.removeEventListener('pause', onPause);
    video.removeEventListener('play', onPlay);
    video.removeEventListener('loadedmetadata', onLoadedMetadata);
    video.removeEventListener('loadstart', onLoadedMetadata);
    video.removeEventListener('durationchange', onLoadedMetadata);
    video.removeEventListener('playing', onPlay);
    video.removeEventListener('ended', onEnded);
    video.removeEventListener('emptied', onEmptiedLike);
    video.removeEventListener('abort', onEmptiedLike);
    video.removeEventListener('stalled', onEmptiedLike);
    video.removeEventListener('seeking', onSeekingHide);
    cancelArm();
    if (cleanupSmart) { try { cleanupSmart(); } catch {} cleanupSmart = null; }
    if (srcAttrMo) { try { srcAttrMo.disconnect(); } catch {} srcAttrMo = null; }
  };
  LC.trackClean(removeHandlers);
}

function createSmartAutoPause(video) {
  const base = getConfig();
  const def = {
    enabled: true,
    blurMinutes: 0.5,
    hiddenMinutes: 0.2,
    idleMinutes: 45,
    useIdleDetection: true,
    respectPiP: true,
    ignoreShortUnderSec: 300
  };
  const sap = Object.assign({}, def, (base.smartAutoPause || {}));
  if (sap.idleThresholdMs != null && sap.idleMinutes == null)      sap.idleMinutes   = Number(sap.idleThresholdMs) / 60000;
  if (sap.unfocusedThresholdMs != null && sap.blurMinutes == null) sap.blurMinutes   = Number(sap.unfocusedThresholdMs) / 60000;
  if (sap.offscreenThresholdMs != null && sap.hiddenMinutes == null) sap.hiddenMinutes = Number(sap.offscreenThresholdMs) / 60000;

  function minToMs(x){ const n = Number(x||0); return (isFinite(n) && n>0) ? n*60000 : 0; }

  const blurMs   = minToMs(sap.blurMinutes);
  const hidMs    = minToMs(sap.hiddenMinutes);
  const idleMs   = minToMs(sap.idleMinutes);
  const useIdle  = !!sap.useIdleDetection;
  const respectP = !!sap.respectPiP;

  if (!sap.enabled) return () => {};
  if (!video)       return () => {};
  const dur = Number(video.duration || 0);
  if (sap.ignoreShortUnderSec && dur > 0 && dur < Number(sap.ignoreShortUnderSec)) {
    return () => {};
  }

  function inPiP(){
    try {
      return !!(document.pictureInPictureElement && (document.pictureInPictureElement === video));
    } catch { return false; }
  }

  const actEvts = ['pointermove','pointerdown','mousedown','mouseup','keydown','wheel','touchstart','touchmove'];
  const onActivity = () => { lastActivityAt = Date.now(); if (lastPauseReason === 'idle') lastPauseReason = null; };

  actEvts.forEach((ev) => document.addEventListener(ev, onActivity, { passive: true }));

  function onFocus(){ blurAt = null; if (lastPauseReason === 'blur') lastPauseReason = null; }
  function onBlur(){  blurAt = Date.now(); }
  window.addEventListener('focus', onFocus, { signal: undefined });
  window.addEventListener('blur', onBlur, { signal: undefined });

  function onVis(){
    if (document.visibilityState === 'hidden') {
      hiddenAt = Date.now();
    } else {
      hiddenAt = null;
      if (lastPauseReason === 'hidden') lastPauseReason = null;
    }
  }
  document.addEventListener('visibilitychange', onVis, { signal: undefined });
  const tickMs = 1000;
  const timer = setInterval(() => {
    try {
      if (!video || video.ended) return;
      const now = Date.now();
      if (respectP && inPiP()) return;
      if (video.paused) return;
      if (hiddenAt && hidMs > 0) {
        if (now - hiddenAt >= hidMs) {
          if (lastPauseReason !== 'hidden' || (now - lastPauseAt) > 3000) {
            video.pause();
            lastPauseReason = 'hidden';
            lastPauseAt = now;
            return;
          }
        }
      }

      if (blurAt && blurMs > 0) {
        if (now - blurAt >= blurMs) {
          if (lastPauseReason !== 'blur' || (now - lastPauseAt) > 3000) {
            video.pause();
            lastPauseReason = 'blur';
            lastPauseAt = now;
            return;
          }
        }
      }
      if (useIdle && idleMs > 0) {
        if (now - lastActivityAt >= idleMs) {
          if (lastPauseReason !== 'idle' || (now - lastPauseAt) > 3000) {
            video.pause();
            lastPauseReason = 'idle';
            lastPauseAt = now;
            return;
          }
        }
      }
    } catch {}
  }, tickMs);

  const onPlayReset = () => { lastPauseReason = null; };
  video.addEventListener('play', onPlayReset);

  return () => {
    clearInterval(timer);
    video.removeEventListener('play', onPlayReset);
    actEvts.forEach((ev) => document.removeEventListener(ev, onActivity));
    window.removeEventListener('focus', onFocus);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVis);
  };
}

    const mo = LC.trackMo(new MutationObserver(muts => {
        muts.forEach(m => m.addedNodes.forEach(n => {
            if (n.nodeType === 1 && n.tagName === 'VIDEO') {
                bindVideo(n);
            }
        }));
        muts.forEach(m => m.removedNodes.forEach(n => {
            if (n === activeVideo) {
                if (removeHandlers) removeHandlers();
                activeVideo = null;
                clearOverlayUi();
            }
        }));
    }));
    mo.observe(document.body, { childList: true, subtree: true });
    const initVid = document.querySelector('video');
    if (initVid) bindVideo(initVid);
    function startOverlayLogic() {
        let _rafRun = true;
        async function loop() {
            if (!_rafRun) return;
            const onValidPage = isVideoVisible(activeVideo);
            if (!onValidPage && overlayVisible) {
                hideOverlay();
            }
            if (!activeVideo) {
                const candidate = document.querySelector('video');
                if (candidate) bindVideo(candidate);
                else if (overlayVisible) hideOverlay();
            }
            if (activeVideo && onValidPage) {
                const isPaused = activeVideo.paused && !activeVideo.ended;
                if (isPaused && !wasPaused) {
                }
                if (!isPaused && wasPaused) hideOverlay();
                wasPaused = isPaused;
            }
            LC.addRaf(loop);
        }
        LC.addRaf(loop);
        const stop = () => {
          _rafRun = false;
          if (LC.rafId != null) { cancelAnimationFrame(LC.rafId); LC.rafId = null; }
        };
        LC.trackClean(stop);
        return stop;
    }
    const _onPop = () => hideOverlay();
    const _onHash = () => hideOverlay();
    const _onVis = () => {
    if (document.visibilityState === 'visible' && !isVideoVisible()) {
      hideOverlay();
    }
  };
    const _onKey = (e) => {
    if (e.key === 'Escape' && overlayVisible) {
        e.preventDefault();
        hideOverlay();
    }
};
    window.addEventListener('popstate', _onPop, { signal });
    window.addEventListener('hashchange', _onHash, { signal });
    document.addEventListener('visibilitychange', _onVis, { signal });
    document.addEventListener('keydown', _onKey, { signal });

    const stopLoop = startOverlayLogic();
    initDescriptorTagsOnce();
    function destroy() {
        try { if (removeHandlers) removeHandlers(); } catch {}
        try { mo.disconnect(); } catch {}
        hideOverlay();
        activeVideo = null;
        currentMediaId = null;
        wasPaused = false;
        if (pauseTimeout) clearTimeout(pauseTimeout);
        pauseTimeout = null;
        activeVideo = null;
        try { stopLoop?.(); } catch {}
        try { LC.cleanupAll(); } catch {}
        try { hideRatingGenre('finished'); } catch {}
        window.__jmsPauseOverlay.active = false;
        window.__jmsPauseOverlay.destroy = null;
    }
    window.__jmsPauseOverlay.destroy = destroy;

    return () => {
        destroy();
    };
}
function isVideoVisible(vid = activeVideo || document.querySelector('video')) {
    if (!vid) return false;
    return vid.offsetParent !== null &&
           !vid.hidden &&
           vid.style.display !== 'none' &&
           vid.style.visibility !== 'hidden' &&
           vid.getBoundingClientRect().width > 0;
}

function convertDurationFromSeconds(sec) {
    const t = Math.floor(sec || 0);
    const m = Math.floor(t / 60), h = Math.floor(m / 60), rm = m % 60, rs = t % 60;
    return h > 0 ? `${h}${labels.sa} ${rm}${labels.dk} ${rs}${labels.sn}` : `${rm}${labels.dk} ${rs}${labels.sn}`;
}

function formatSeasonEpisodeLine(ep) {
    const sWord = labels.season || 'Season';
    const eWord = labels.episode || 'Episode';
    const sNum = ep?.ParentIndexNumber;
    const eNum = ep?.IndexNumber;
    const eTitle = ep?.Name ? ` – ${ep.Name}` : '';
    const numberFirst = new Set(['tur']);

    let left = '', right = '';
    if (numberFirst.has(currentLang)) {
        if (sNum != null) left = `${sNum}. ${sWord}`;
        if (eNum != null) right = `${eNum}. ${eWord}`;
    } else {
        if (sNum != null) left = `${sWord} ${sNum}`;
        if (eNum != null) right = `${eWord} ${eNum}`;
    }

    const mid = left && right ? ' • ' : '';
    return `${left}${mid}${right}${eTitle}`.trim();
}

function formatEpisodeLineShort(ep) {
  const eNum = ep?.IndexNumber;
  const titlePart = ep?.Name ? ` - ${ep.Name}` : '';
  const lang = String(currentLang || '').toLowerCase();
  const fallbackWords = {
    tur: 'bölüm',
    eng: 'Episode',
    en:  'Episode',
    fra: 'Épisode',
    fr:  'Épisode',
    deu: 'Folge',
    de:  'Folge',
    rus: 'серия',
    ru:  'серия'
  };
  const rawWord =
    (labels && typeof labels.episode === 'string' && labels.episode.trim()) ||
    fallbackWords[lang] ||
    'Episode';

  const numberFirstOverride =
    typeof labels?.numberFirstEpisode === 'boolean' ? labels.numberFirstEpisode : null;

  const numberFirst =
    numberFirstOverride !== null
      ? numberFirstOverride
      : (lang === 'tur' || lang === 'ru' || lang === 'rus');

  if (eNum == null) {
    return `${rawWord}${titlePart}`.trim();
  }

  if (lang === 'tur') {
    const w = rawWord.toLocaleLowerCase('tr');
    return `${eNum}.${w}${titlePart}`;
  }

  if (lang === 'ru' || lang === 'rus') {
    const w = rawWord.toLocaleLowerCase('ru');
    return `${eNum} ${w}${titlePart}`;
  }

  return `${rawWord} ${eNum}${titlePart}`;
}

function getApiClientSafe() {
  return (window.ApiClient && typeof window.ApiClient.serverAddress === 'function') ? window.ApiClient : null;
}
function getApiBase() {
  const api = getApiClientSafe();
  return api ? api.serverAddress() : (getConfig()?.serverAddress || '');
}
function getUserIdSafe() {
  const api = getApiClientSafe();
  return (api && typeof api.getCurrentUserId === 'function' && api.getCurrentUserId()) || getConfig()?.userId || null;
}

function buildImgUrl(item, kind='Primary', w=300, h=169) {
  if (!item?.Id) return '';
  const tag =
    (item.ImageTags && (item.ImageTags[kind] || item.ImageTags['Primary'])) ||
    item.PrimaryImageTag || item.SeriesPrimaryImageTag || '';
  const base = getApiBase();
  const q = new URLSearchParams({
    fillWidth: String(w),
    fillHeight: String(h),
    quality: '90',
    tag
  });
  return `${base}/Items/${item.Id}/Images/${kind}?${q.toString()}`;
}

function buildBackdropUrl(item, w = 360, h = 202) {
  const base = getApiBase();
  if (!item) return '';

  const directTag =
    (Array.isArray(item.BackdropImageTags) && item.BackdropImageTags[0]) ||
    (Array.isArray(item.ParentBackdropImageTags) && item.ParentBackdropImageTags[0]) ||
    null;
  if (directTag) {
    const q = new URLSearchParams({
      fillWidth: String(w),
      fillHeight: String(h),
      quality: '90',
      tag: directTag
    });
    return `${base}/Items/${item.Id}/Images/Backdrop?${q.toString()}`;
  }

  if (item.ParentId) {
    const q = new URLSearchParams({
      fillWidth: String(w),
      fillHeight: String(h),
      quality: '90'
    });
    if (Array.isArray(item.ParentBackdropImageTags) && item.ParentBackdropImageTags[0]) {
      q.set('tag', item.ParentBackdropImageTags[0]);
    }
    return `${base}/Items/${item.ParentId}/Images/Backdrop?${q.toString()}`;
  }

  const seriesId = item.SeriesId || null;
  const seriesBackdropTag =
    item.SeriesBackdropImageTag ||
    (Array.isArray(item.SeriesBackdropImageTags) && item.SeriesBackdropImageTags[0]) ||
    null;

  if (seriesId) {
    const q = new URLSearchParams({
      fillWidth: String(w),
      fillHeight: String(h),
      quality: '90'
    });
    if (seriesBackdropTag) q.set('tag', seriesBackdropTag);
    return `${base}/Items/${seriesId}/Images/Backdrop?${q.toString()}`;
  }
  return buildImgUrl(item, 'Primary', w, h);
}

function goToItem(item) {
  if (!item?.Id) return;
  const type = item.Type;
  if (type === 'Episode') {
    location.href = `#!/details?id=${encodeURIComponent(item.Id)}`;
  } else if (type === 'Season') {
    location.href = `#!/details?id=${encodeURIComponent(item.Id)}`;
  } else {
    location.href = `#!/details?id=${encodeURIComponent(item.Id)}`;
  }
}
async function fetchUnplayedEpisodesInSameSeason(currentEp, { limit = 5 } = {}) {
  if (!currentEp?.SeasonId) return [];
  const { userId } = getSessionInfo();
  const qs = new URLSearchParams({
    ParentId: currentEp.SeasonId,
    IncludeItemTypes: 'Episode',
    Recursive: 'false',
    UserId: userId || '',
    Filters: 'IsUnplayed',
    Limit: String(limit + 1),
    Fields: [
      'UserData',
      'PrimaryImageAspectRatio',
      'RunTimeTicks',
      'ProductionYear',
      'SeriesId',
      'ParentId',
      'ImageTags',
      'PrimaryImageTag',
      'BackdropImageTags',
      'ParentBackdropImageTags',
      'SeriesBackdropImageTag',
      'SeriesPrimaryImageTag'
    ].join(',')
    , SortBy: 'IndexNumber',
    SortOrder: 'Ascending'
  });
  const data = await makeApiRequest(`/Items?${qs.toString()}`);
  const items = data?.Items || [];
  return items.filter(i => i.Id !== currentEp.Id).slice(0, limit);
}

async function fetchSimilarUnplayed(item, { limit = 5 } = {}) {
  if (!item?.Id) return [];
  const { userId } = getSessionInfo();
  const qs = new URLSearchParams({
    UserId: userId || '',
    Limit: String(limit * 3),
    EnableUserData: 'true',
    Fields: [
      'UserData',
      'PrimaryImageAspectRatio',
      'RunTimeTicks',
      'ProductionYear',
      'Genres',
      'SeriesId',
      'ParentId',
      'ImageTags',
      'PrimaryImageTag',
      'BackdropImageTags',
      'ParentBackdropImageTags',
      'SeriesBackdropImageTag',
      'SeriesPrimaryImageTag'
    ].join(',')
  });
  const items = await makeApiRequest(`/Items/${encodeURIComponent(item.Id)}/Similar?${qs.toString()}`);
  const list = Array.isArray(items) ? items : (items?.Items || []);
  const unplayed = list.filter(x => {
    const ud = x?.UserData || {};
    if (typeof ud.Played === 'boolean') return !ud.Played;
    if (typeof ud.PlayCount === 'number') return ud.PlayCount === 0;
    return true;
  });
  return unplayed.slice(0, limit);
}

function renderRecommendations(items) {
  const recos = document.getElementById('jms-overlay-recos');
  const row = document.getElementById('jms-recos-row');
  if (!recos || !row) return;
  row.innerHTML = '';
  if (!items?.length) {
    recos.classList.remove('visible');
    return;
  }
  items.forEach(it => {
     const card = document.createElement('button');
     card.className = 'pause-reco-card';
     card.type = 'button';
     const imgUrl = buildBackdropUrl(it, 360, 202);
     const primaryFallback = buildImgUrl(it, 'Primary', 360, 202);
     const titleText = (it.Type === 'Episode')
     ? formatEpisodeLineShort(it)
     : (it.Name || it.OriginalTitle || '');
     const wrap = document.createElement('div');
     wrap.className = 'pause-reco-thumb-wrap';
     if (imgUrl) {
       const img = document.createElement('img');
       img.className = 'pause-reco-thumb';
       img.loading = 'lazy';
       img.alt = '';
       img.src = imgUrl;
       img.onerror = () => { img.onerror = null; img.src = primaryFallback; };
       wrap.appendChild(img);
     } else {
       const ph = document.createElement('div');
       ph.className = 'pause-reco-thumb';
       wrap.appendChild(ph);
     }
     const title = document.createElement('div');
     title.className = 'pause-reco-title';
     title.textContent = titleText;
     card.appendChild(wrap);
     card.appendChild(title);
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      goToItem(it);
    });
    row.appendChild(card);
  });
  recos.classList.add('visible');
}

if (!window.__jmsPauseOverlay._boundUnload2) {
  window.addEventListener('beforeunload', () => {
    for (const v of imageBlobCache.values()) { if (v) URL.revokeObjectURL(v); }
    imageBlobCache.clear();
  });
  window.__jmsPauseOverlay._boundUnload2 = true;
}
