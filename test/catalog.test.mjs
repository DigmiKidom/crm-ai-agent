// The landing page's item list, and the plan limits around it.
//
// Worth pinning down because both halves are load-bearing in ways a build
// can't see: normalizeCatalog() is the trust boundary for tenant-submitted
// rows (the editor's caps are a courtesy, this is the enforcement), and the
// plan helpers are the difference between a lapsed subscriber keeping their
// data and losing it.
import assert from "node:assert/strict";
import {
  blankCatalogItem,
  catalogMediaIds,
  normalizeCatalog,
  MAX_CATALOG_ITEMS,
  MAX_CATALOG_TITLE,
  MAX_CATALOG_DESCRIPTION,
  MAX_CATALOG_PRICE,
} from "../lib/catalog.js";
import {
  catalogLimit,
  galleryLimit,
  isProPlan,
  FREE_GALLERY_PHOTOS,
  PRO_GALLERY_PHOTOS,
  PRO_CATALOG_ITEMS,
  MAX_GALLERY_PHOTOS,
} from "../lib/plan.js";

let pass = 0, fail = 0;
function check(name, fn) {
  try { fn(); console.log("  ok   " + name); pass++; }
  catch (e) { console.log("  FAIL " + name + "\n        " + e.message); fail++; }
}

const throws = (fn, code) => {
  try {
    fn();
  } catch (e) {
    assert.equal(e.code, code, `expected code ${code}, got ${e.code}`);
    return;
  }
  throw new Error(`expected a ${code} error, nothing was thrown`);
};

console.log("\n— plan limits —");

check("pro is the only paid plan, and free is everything else", () => {
  assert.equal(isProPlan("pro"), true);
  assert.equal(isProPlan("free"), false);
  // Anything unrecognised — a typo, a plan name from the future, undefined on
  // a tenant created before the field existed — must read as free. Failing
  // open here would hand out paid features to bad data.
  assert.equal(isProPlan(undefined), false);
  assert.equal(isProPlan("PRO"), false);
  assert.equal(isProPlan("enterprise"), false);
});

check("the gallery grows on pro and the item list only exists there", () => {
  assert.equal(galleryLimit("free"), FREE_GALLERY_PHOTOS);
  assert.equal(galleryLimit("pro"), PRO_GALLERY_PHOTOS);
  assert.equal(catalogLimit("free"), 0);
  assert.equal(catalogLimit("pro"), PRO_CATALOG_ITEMS);
});

check("the schema ceiling is the pro allowance, never the free one", () => {
  // This is what keeps a lapsed subscriber's saved page loadable: the Tenant
  // schema validates against the ceiling, so fifteen photos written while
  // they were paying don't become a document mongoose refuses to hand back
  // the moment they drop to free.
  assert.equal(MAX_GALLERY_PHOTOS, PRO_GALLERY_PHOTOS);
  assert.equal(MAX_CATALOG_ITEMS, PRO_CATALOG_ITEMS);
  assert.ok(MAX_GALLERY_PHOTOS > FREE_GALLERY_PHOTOS);
});

check("both premium lists cap at fifteen", () => {
  assert.equal(PRO_GALLERY_PHOTOS, 15);
  assert.equal(PRO_CATALOG_ITEMS, 15);
});

console.log("\n— item list —");

check("trims, keeps order, and normalises a missing photo to null", () => {
  const out = normalizeCatalog([
    { title: "  Espresso  ", description: " Short and dark ", price: " ₪12 " },
    { title: "Cortado", mediaId: "507f1f77bcf86cd799439011" },
  ]);
  assert.deepEqual(out, [
    { title: "Espresso", description: "Short and dark", price: "₪12", mediaId: null },
    { title: "Cortado", description: "", price: "", mediaId: "507f1f77bcf86cd799439011" },
  ]);
});

check("a completely blank row is dropped, not rejected", () => {
  // The editor always renders one empty row to type into. A tenant who
  // doesn't want an item list must not have to delete it before they can
  // save the rest of the page.
  assert.deepEqual(normalizeCatalog([blankCatalogItem()]), []);
  assert.deepEqual(normalizeCatalog([]), []);
  assert.deepEqual(normalizeCatalog(null), []);
  assert.deepEqual(normalizeCatalog("nonsense"), []);
});

check("a row with content but no name is rejected rather than dropped", () => {
  // Dropping it would silently discard an upload the tenant just waited for.
  throws(() => normalizeCatalog([{ price: "₪12" }]), "MISSING_TITLE");
  throws(() => normalizeCatalog([{ mediaId: "507f1f77bcf86cd799439011" }]), "MISSING_TITLE");
  throws(() => normalizeCatalog([{ title: "   ", description: "x" }]), "MISSING_TITLE");
});

check("free plans can't save an item list at all", () => {
  throws(() => normalizeCatalog([{ title: "Espresso" }], { limit: 0 }), "NOT_INCLUDED");
  // But an empty list still saves cleanly on free — otherwise every free
  // tenant's landing-page save would fail on a field they never touched.
  assert.deepEqual(normalizeCatalog([blankCatalogItem()], { limit: 0 }), []);
});

check("the limit is the plan's, not the schema's", () => {
  const items = Array.from({ length: 16 }, (_, i) => ({ title: `Item ${i}` }));
  throws(() => normalizeCatalog(items, { limit: PRO_CATALOG_ITEMS }), "TOO_MANY");
  assert.equal(normalizeCatalog(items.slice(0, 15), { limit: PRO_CATALOG_ITEMS }).length, 15);
});

check("over-long fields are cut, not refused", () => {
  const [item] = normalizeCatalog([
    {
      title: "t".repeat(500),
      description: "d".repeat(1000),
      price: "p".repeat(200),
    },
  ]);
  assert.equal(item.title.length, MAX_CATALOG_TITLE);
  assert.equal(item.description.length, MAX_CATALOG_DESCRIPTION);
  assert.equal(item.price.length, MAX_CATALOG_PRICE);
});

check("price is a label, never a number", () => {
  // Businesses write all of these, and none of them survives being parsed as
  // a decimal. Nothing downstream does arithmetic on this field.
  for (const price of ["₪120", "From $50", "Price on request", "2 for 1", "£8.50"]) {
    assert.equal(normalizeCatalog([{ title: "x", price }])[0].price, price);
  }
});

check("collects the images to ownership-check, deduplicated", () => {
  const ids = catalogMediaIds([
    { mediaId: "507f1f77bcf86cd799439011" },
    { mediaId: "507f1f77bcf86cd799439011" },
    { mediaId: null },
    {},
    { mediaId: "507f1f77bcf86cd799439012" },
  ]);
  assert.deepEqual(ids, ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"]);
  assert.deepEqual(catalogMediaIds(undefined), []);
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
