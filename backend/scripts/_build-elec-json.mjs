import fs from 'fs';
const SC = '/private/tmp/claude-501/-Users-gainertatsuya-Downloads-----/0523a2fa-5000-4b96-a4c6-0f46441a9469/scratchpad';
const map = JSON.parse(fs.readFileSync(`${SC}/elec-map.json`,'utf8'));
const out = { categoryName: 'ABA-FK2', units: [] };
let totalParts = 0;
for (const u of map.units) {
  const p = `${SC}/elec-raw/${u.code}.txt`;
  if (!fs.existsSync(p)) { console.log('MISSING raw:', u.code); continue; }
  const lines = fs.readFileSync(p,'utf8').split('\n').filter(l=>l.trim() && !l.startsWith('DIAGRAM'));
  const parts = lines.map((l,i) => {
    const [ref,pn,name,eur] = l.split('|').map(s=>s.trim());
    return { ref, pn, name, eur: (eur==='null'||eur===undefined||eur==='') ? null : parseFloat(eur), sortOrder: i };
  }).filter(x=>x.pn);
  out.units.push({ code: u.code, unitName: u.name, genre: u.genre, parts });
  totalParts += parts.length;
}
fs.writeFileSync(`${SC}/elec-final.json`, JSON.stringify(out,null,2));
// genre summary
const byGenre = {};
for (const u of out.units){ byGenre[u.genre]=(byGenre[u.genre]||0); byGenre[u.genre]+=u.parts.length; }
console.log('units:', out.units.length, 'parts:', totalParts);
console.log('genres:'); for (const [g,n] of Object.entries(byGenre)) console.log(`  ${g}: ${n} parts`);
