import assert from 'node:assert/strict';
import { translate } from '../lib/i18n/translate';
import greek from '../lib/i18n/el.json';
import { createColony } from '../lib/simulation/engine';
import { CityEngine } from '../lib/city/engine';
import { SolarEngine } from '../lib/solar/engine';

assert.equal(translate('Ant colony', 'el'), 'Αποικία μυρμηγκιών');
assert.equal(translate('Solar System Lab', 'el'), 'Εργαστήριο Ηλιακού Συστήματος');
assert.equal(translate('City Life', 'el'), 'Ζωή στην πόλη');
assert.equal(translate(' Sensed protein nearby ', 'el'), ' Εντόπισε κοντά: πρωτεΐνη ');
assert.equal(translate('EARTH SPEED', 'el'), 'ΤΑΧΥΤΗΤΑ: ΓΗ');
assert.equal(translate('12 workers across both views', 'el'), '12 εργάτριες και στις δύο προβολές');
assert.equal(translate('Worker #42', 'el'), 'Εργάτρια #42');
assert.equal(translate('Comet 2 launched.', 'el'), 'Εκτοξεύτηκε: Κομήτης 2.');
assert.equal(translate('Taking the Loop bus — the fare is free.', 'el'), 'Παίρνω την κυκλική γραμμή — το εισιτήριο είναι δωρεάν.');
assert.equal(translate('Arrived at work after 12 minutes. On time for my shift.', 'el'), 'Έφτασα στη δουλειά μετά από 12 λεπτά. Στην ώρα μου για τη βάρδια.');
assert.equal(translate('Heading to work at Design Studio. It is close enough to walk.', 'el'), 'Πηγαίνω στη δουλειά — Στούντιο σχεδιασμού. Είναι αρκετά κοντά για να πάω με τα πόδια.');
assert.equal(translate('User-created name 123', 'el'), 'User-created name 123');
for (const key of Object.keys(greek)) {
  assert.equal(translate(key, 'en'), key, 'English must preserve the source message');
  if (/[a-z]/i.test(greek[key as keyof typeof greek])) assert.match(greek[key as keyof typeof greek], /[\u0370-\u03ff\u1f00-\u1fff]/u, `Missing Greek translation: ${key}`);
  const slots = (s: string) => (s.match(/\{\d+\}/g) ?? []).sort();
  assert.deepEqual(slots(key), slots(greek[key as keyof typeof greek]), `Interpolation mismatch: ${key}`);
}
const colony = createColony(), city = new CityEngine(), solar = new SolarEngine();
const before = JSON.stringify([colony, city.state, solar.bodies]);
for (const ant of colony.ants) { translate(ant.task, 'el'); translate(ant.reason, 'el'); }
for (const resident of city.state.citizens) translate(resident.reason, 'el');
for (const body of solar.bodies) translate(body.name, 'el');
assert.equal(JSON.stringify([colony, city.state, solar.bodies]), before, 'Language changes must not modify simulation or save data');
console.log(`Greek localization checks passed (${Object.keys(greek).length} messages across all three simulations).`);
