import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const envPath = process.env.HOME + "/storage/shared/HTML/stockcheck-scaffold/backend/.env";
const env = {};
for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const excludeKeywords = [
  "abesco", "barrier", "baodelli", "bahco",
  "bb flat garden hose", "black rhino", "bostik ultrafino", "boysen flatwall", "boysen qde",
  "briggs", "crosby", "flexovit", "gf/pp brass", "gmb door closer", "gowell", "gv st. coupling",
  "hardiflex screw", "harrix", "hd door track", "hd s. electrode holder", "hibo",
  "hippo aluminum screen", "hippo polyethelane", "hitech paint brush", "hyundae",
  "imperial garden hose", "japan diamond cutting", "japan entrance lockset", "japan hd",
  "japan hedge shear", "japan lpg hose", "japan tile cutter", "kaingin roofing", "kawaguchi",
  "lucky", "mailtank", "matrix", "multiflex", "niko", "nikko", "pinco", "plastic strap", "rhino",
  "rsc locknut", "sanwa", "sepplefrickle", "service drop wire", "service entrance", "sisco",
  "speaker wire", "taiwan bar sink", "taiwan drawer", "taiwan entrance", "taiwan hd screwdriver",
];

const overrides = [
  { test: n => n.includes("amerilock") && (n.includes("9660h") || n.includes("9880h") || n.includes("drawer lock") || n.includes("drawerlock")), floor: "2nd floor", label: "amerilock drawer lock override" },
  { test: n => n.includes("butterfly") && n.includes("floor sand"), floor: "3rd floor", label: "butterfly floor sanding override" },
  { test: n => n.includes("abc") && !n.includes("tile grout") && !n.includes("tile adhesive") && !n.includes("zemcoat"), floor: "Special order", label: "abc (other) override" },
];

const rules = [
  { floor: "Ground floor office", keywords: ["dormer","irwin","nicholson","hss drill bit","tyrolit","sandflex","amerilock","butterfly combination","butterfly box wrench","butterfly open wrench","butterfly socket wrench","bastard file","harris silver rod","lenox omega double sided tape","omega snap off","omega strong double sided tape","rosco line color"] },
  { floor: "Ground floor", keywords: ["common wire nail","finishing wire nail","abc tile adhesive","zemcoat","skimcoat","golden dragon","bolton bowl","china cylindrical hinge","sahara cement","golden bridge","welding rod","mech gi","gi nipple","taiwan door spring","chrome pipe","atlanta moulding","moulding","china concrete nail","weber epoxy primer","patching compound","jetmatic","barbed wire","cyclone wire","combat wire","narrow butt hinge","brass piano hinge","stainless piano hinge","doorguard stainless hinge","china loose pin","plow chain","ship chain","straight bar","nihonweld","toyoweld","hard asphalt","hardwarecloth 1/4","gauge 16 welded wire","india cement drum","battery terminal","bronze rod","chalkstone","china roofing nail","china shoe tacks","china silver rod","china smooth nail","china welded wire","ci floor drain","ci lavatory","doorguard stainless narrow butt","expansion shield","galvanized turnbuckle","imperial tile trim","lag screw","malleable","nikolite bar","pvc moulding","sunrise"] },
  { floor: "Mezzanine", keywords: ["bostik","no more nail","powermix","fulatite","4 in 1 oil","stikwel","mighty bond","mighty gasket","pioneer","rugby","centro","polituff","solignum","prosil","tekscrew","turco","tile grout","abc grout","koten","snap off knife","cold chisel","lion welded wire","fuji welded wire","patching box","shellwood","yale door clos","wd 40","el heneral","vulcaseal","elastiseal","elastoseal","gypsum screw","neltex","do all","thoroseal","omega wire","omega flat cord","joinsil","hd putty knife","india green box","stripsol","hudson","s blue","wipeout","valiant","blind rivet","aero gloss","aerogloss","a1 metal polish","alpha borax","benz werkz","brazil sharpening","bulldog","champion lye","el kapitan","federal","hd waterproofing tape","india colored cement","japan soldering lead","marksman","master black coal tar","master roof cement","omega cloth duct tape","omega aluminum duct tape","omega pdx","omega thhn","omega tw","orion tw wire","sewer rod"] },
  { floor: "3rd floor", keywords: ["hm blue","pe screen","steelmate","mattock","garden hoe","sledge hammer","axe","garden rake","seneca hanvit","dragonfly","nagoya","gloves","paint brush","cement trowel","plastering trowel","packaging tape","masking tape","royal plastic hose","extrathick hose","shelf bracket","ptrap","p trap","mop head","mop handle","america","delta","oppo","euroflex","royalflex","steel brush","hrc","neutech","hose coupling","jackson","rat cage","jopex","kitchen sink","teflon","hippo roller","expanded wire","3m floor sanding","carburandom floor sanding","carburandum floor sanding","aquaflex","armak masking tape","hippo floor sanding","armstrong","blue pvc clamp","orange pvc clamp","butterfly sledge hammer","butterfly axe blade","chicago","china led","china pillow block","china porcelain","cylinder pump","doorguard deadbolt","doorguard leverset","doorguard padlock","doorguard rim night latch","doormate","dust mask","ecodex","fanal","flexco deadbolt","flexco entrance lockset","g.gold extra thick","gardenmate","german ballast","golden dragon entrance lockset","king's","korea stainless","nutech al bp","ohayo paint brush","omega acrylon","omega cotton","omega mini","omega woolmax","omega foam","omega floor sanding","omega washi","osaka","pe black pipe","pvc insect sprayer","pvc sink strainer","pvc floor drain","quickstop","rainbow garden","rg-59","rg-6","roto ventillating","scaffolding","seneca aluminum screen","silent flush","superflex","taiwan basket","taiwan sink","taiwan caulking gun","taiwan concealed","kaibigan garden","hippo cotton","hippo foam","hippo paint roller","stainless kitchen sink"] },
  { floor: "2nd floor", keywords: ["butterfly","stanley","orion","foot valve","ss clamp","gi clamp","rosco","starwheel","watts nylon","omico","rubicon","carbon brush","meco","safety hasp","barrel bolt","advance brass","bpack","master padlock","putty knife","pe black fitting","wood chisel","metal screw","wood screw","nylon rope","watermate","pvc faucet","ryder","armak","safari","sandpaper","ohayo","cup hook","roller catch","greenfield","welding lens","artist brush","pressure switch","pressure gauge","sanding disc","cup brush","square hook","hook and eye","ebc door closer","regulator","staple wire","bosny","maxim","maxten","entrance lockset","pipe holder","flexco","xus","shower valve","ball valve","elastoseal","fuji hose","hitech","fiberglass mesh tape","gi nipple","water meter","cable splitter","2b padlock","booster cable","butterfly cement trowel","butterfly combination pliers","butterfly combination try square","butterfly pointed cold chisel","butterfly flat cold chisel","china ball pein hammer","china adjustable wrench","china box wrench","china open wrench","china diagonal cutting","china drawer lock","china hacksaw","china knife switch","china long nose","china pipe wrench","china slip joint","china try square","ci young","dog chain","egret","elegance","elephant table scale","ever safety switch","fighter","fuji lpg hose","fuji star","galvanized dog chain","galvanized hose clamp","german brass chain","globe padlock","gv brass gate valve","gv brass ball valve","gv water meter","gv brass hose bib","gv brass plain bib","gv brass swing check valve","japan ball faucet","japan brass wire brush","japan magnetic catches","japan rubber caster","japan steel caster","jim dandy","kaibigan stainless floor drain","kitz gate valve","kitz ball valve","korea brass hose bib","korea brass plain bib","leather dog","lpg hose clamp","master bicycle","master combination","nylon dog collar","pe black compression fitting","plumb bob","pvc ball faucet","pvc handle long","rosco flap disc","rosco masonry","rosco measuring tape","s hook","stainless hose clamp","storch foam","taiwan ball faucet","taiwan aqua","taiwan brass","taiwan center","taiwan chrome","taiwan claw hammer","taiwan hd shower valve","taiwan italy type","taiwan kitchen","taiwan lavatory","taiwan pig drinker","taiwan pin on"] },
  { floor: "Warehouse 2", keywords: ["hd brass check valve","hd brass foot valve","tw loose pin","hardwarecloth 1/8","euroflex","kz brass ball valve","kz brass gate valve","pvc paint tray","pvc cement pail","shovel","sahara cement","ladder","gi wire","doorguard concealed hinges","doorguard hydraulic","japan metal cutting wheel 14","japan sandpaper","kyotoweld","plastic twine","ryder shovel","steelmate shovel","kf shovel","taiwan door closer"] },
  { floor: "Special order", keywords: ["auto wire","kwikset","rosco axe","rosco brass ball valve","rosco brass gate valve","rosco combination","rosco cutter blade","rosco mgas"] },
  { floor: "Sample stock", keywords: ["bradley","omega diamond cup wheel","omega flap disc","omega superthin","omega ultra thin","omega wall scraper"] },
];

function normalize(name) {
  return (name || "")
    .toLowerCase()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function match(name) {
  const n = normalize(name);

  if (excludeKeywords.some(kw => n.includes(kw))) {
    return { excluded: true };
  }

  for (const ov of overrides) {
    if (ov.test(n)) return { hits: [{ floor: ov.floor, kw: ov.label }] };
  }

  const hits = [];
  for (const rule of rules) {
    for (const kw of rule.keywords) {
      if (n.includes(kw)) {
        hits.push({ floor: rule.floor, kw });
        break;
      }
    }
  }
  return { hits };
}

const PAGE = 1000;
let allItems = [];
let from = 0;
while (true) {
  const { data, error } = await admin
    .from("items")
    .select("id, sku, name, location")
    .range(from, from + PAGE - 1);
  if (error) {
    console.error("Fetch failed at offset " + from + ": " + error.message);
    process.exit(1);
  }
  allItems = allItems.concat(data);
  console.log(`Fetched ${allItems.length} so far...`);
  if (data.length < PAGE) break;
  from += PAGE;
}

const lines = ["sku,name,current_location,proposed_floor,matched_on,ambiguous"];
let matched = 0, ambiguous = 0, unmatched = 0, excluded = 0;

for (const it of allItems) {
  const result = match(it.name || "");
  if (result.excluded) {
    excluded++;
    continue;
  }
  const hits = result.hits;
  const csvName = `"${(it.name || "").replace(/"/g, '""')}"`;
  const curLoc = `"${(it.location || "").replace(/"/g, '""')}"`;
  if (hits.length === 0) {
    unmatched++;
    lines.push(`${it.sku},${csvName},${curLoc},,,`);
  } else if (hits.length === 1) {
    matched++;
    lines.push(`${it.sku},${csvName},${curLoc},${hits[0].floor},${hits[0].kw},no`);
  } else {
    ambiguous++;
    const floors = hits.map(h => h.floor + " (" + h.kw + ")").join(" | ");
    lines.push(`${it.sku},${csvName},${curLoc},${hits[0].floor},"${floors}",yes`);
  }
}

const outPath = process.env.HOME + "/location-review.csv";
fs.writeFileSync(outPath, lines.join("\n"));
console.log(`Total items: ${allItems.length}`);
console.log(`Matched: ${matched}, Ambiguous: ${ambiguous}, Unmatched: ${unmatched}, Excluded (phased out): ${excluded}`);
console.log("Review file written to " + outPath);
