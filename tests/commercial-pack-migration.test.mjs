import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  getPhotoPack,
  getPhotoPackForHistory,
  photoPacks,
} from "../src/lib/photoPacks.ts";
import {
  SHORT_NANO_PACK_REFERENCE_COUNT,
  getShortNanoPackDefinition,
  shortNanoPackDefinitions,
} from "../src/lib/ai/short-pack-prompts.ts";

const expectedPromptHashes = {
  "black-minimalism": [
    "6bf45decf407b8c8cac71dafac477de5d032a026c6c49b87742a5f5aa9c2fe21",
    "3568e020a5c3ac8998c25f4227517a6d5ac7dd898252d1594932948e5417d289",
    "5ec736bc15585c3a9131a174ad3b76c27f4a131869d1eb166719b17502f7015e",
    "e7d6c9da5f6da6cf29c1a42d49c607e36e636bd46f6aa7f8ed08e3f96d3eee16",
  ],
  "autumn-promenade": [
    "0e18a44ee035f76630cf63f525c27b76a8d269a7c8073aa1bdb88b780489c07f",
    "6306e52683af57a2130f1b893c42637e99cbd0507c5cd8d72cf4b48ee4365ed7",
    "280a780734b17ed42b31ca21d46239c41d1ee89d6aa6aa25239122a26be45b5f",
    "1557b6fa6b1d1f8ebb5b60bcae495c1a857a8ac1a6bf9f10d22a1efc18bac5df",
  ],
  "misty-morning": [
    "989195b1122c55d617dd5fc320a4b30f7826efe462c692a4e398a77e2d1de3db",
    "6039a305a6f71655da20aa8d53b22a17acd4a18af4cbac09b540547fbdadb705",
    "95ec8500cf403cb8b3703d35b723b84717a118f82f1ac00493a7cac0f307c819",
    "a5832a2db800c77d1f34907a042dc15caa0ad5669cf229b7a00eac1ffd96c8ca",
  ],
  "golden-field": [
    "43179924cc35f157ad29f048aea2928c44f41e20ce959de72a37964a70ad9b21",
    "ef0d26934e817221ca2cf5a3f69c2b57b6760bef93ddcd8d8b39749242b28ee6",
    "7d4c46ca71aca939448e3743ed366d2d4a6a0cd7885b0c20f529bd601f946155",
    "942abfcc67d010d6970abf8fffa91d4ba3f1336622a6bc239047bf92d631cdb4",
  ],
  "scarlet-accent": [
    "bf2bcd769091db54c66e996317fc4dbf623de223062dffbcde5e8c1944d387e1",
    "4c8c8f73810ff82f3c86acb7089d5af4b751968ce9c5637a9bd9893b7ea102f5",
    "55736b3adc34181f1d127f25775c949d1fe9636da0cbba1c6d30584001e1a2df",
    "804a81ebfd7447cf9187652bfb9fbf03b300cc50b857dc6183973d50998d618e",
  ],
  "turquoise-wave": [
    "1505e95e2895b71946b0859a610cfc032d48a91359f4e33a6aa7c12e857c3f2b",
    "475fb655faa1f10805a0f4fbdc13e6d44d2a08f2f3edb11950173db045746e40",
    "62d351048488a774b3206182e1a4d50bd74986cda31ba98a796ce0ece251f4ae",
    "682a757142bd8af21ab4a1f782b628d52c1ad2786f4b60bf3a6b8ef876de8985",
  ],
  "pink-manifesto": [
    "4d3a5752384de3af22f8c7aaedcbfcd1191617b2200757454a4d051d298b36d4",
    "0113f0a01dd99f014d60d8acf2da34bf5a3824238b18bd07e4e1ace4d233ce73",
    "8d0c106a45109dd86f00dc1ed9cdc4e1473cec3f3554a5a5ebcb0d3c2684eb7b",
    "143934690823b507965c9635b62ccd558acff1c2213865ca0b3b045ba0bddeb7",
  ],
  "make-a-wish": [
    "d560fdbc9124975383921b8b818bd296733a35c38e596869022d35cb4b65f6d0",
    "52856090db225e6e420e778d960abfd9eb8c699db2c67a73b5b57a68e942089e",
    "14c55e294233466cbe3a4e4897fa8cfb677632edc3b41606a94a0339c4c2cf24",
    "222d7b099babf2de2747ed2637e38ac57dc2fabdc4ab6ad8fb4f6e7c5f7a417d",
  ],
  "golden-reflection": [
    "fd32a0c5f1d0d4843b6b401e4d287a5625d19db22043f985f95fe1a07759ecd6",
    "be5deae42a119608747551d1ae6c3dd1db9a52b2ba60cbd56e7d115e81d57c61",
    "1e868679f33dd99d378dfc99142e2b71be909559e73e00a2f6d05eee6f50c047",
    "ed081681cd042cec905c8bd048709473885dd510ac25e9f8d8f24d8c8bfa2ea4",
    "e8738c2289ab86d9e139f0341780cb0fc0289000e47ec23c09d4dfc4fc5bd108",
    "a0fdcd5475dfa918cf93838685bc3de7e4818bf76975b80b6b7fab0cce79e6ae",
    "232e6781bf98c5c738192e641960d6f349518034fea02b64ebdf82273bd6219d",
    "1db5a79f73ff1227c9a823fd9808571bc1b4b9e2b3c6d8a582cb60efe361564d",
  ],
  "scarlet-accent-2": [
    "f640bb337eea1ed359feb7a10840b98960255ffcf70cc1a8ca28182c1f94f1a9",
    "82842034ca3d0a361f0f66eb90868e1106d96707fe07faad6bfe32fd385356f9",
    "b28ef4333ebd10efa8c171c20a47001e54b5ba05b4559344a7f8944a06bce28f",
    "03f171636ad88d59dfa4537875d6bd1ef45ac20e94d1e35528b00c37b310f74b",
  ],
  "autumn-lake": [
    "3782462b35a6d320079a9ddec64040412148af7aed3f1f846a927d0db3c2449a",
    "5181075c9a577cd6b15f3df75dcc4409db16f212975d883daebf2b1fe2f2af04",
    "a39160ba193b49c9a7e83ba09547df80c89f5ee02cf16064abe4258d9abfa344",
    "779a36bb9eea398ebad7b75a9951de2254f823786dece3a640f29dd1a024e728",
    "f851f70d193e33a7828c9d741340473f740663c74e3d4a7f09d1384b3c742dd4",
  ],
  "autumn-route": [
    "a989b1179e586aa360565c4fbb10a20f318b26bd762a664621e4b319b2d3ac51",
    "cec2d5e9a7f2c64ade2d6c1c8b3c3a6d5c1efbcbf77dbf92f12aab88e4d67351",
  ],
  "misty-cabin": [
    "b21d447fd9b8c1c8e0926dc9ff150260dd4fa6a81d4ee2e579d9d2432edd18db",
    "0a63f92ff51d2c6a0e6e32520af8a6f2c6c560eb5640616ca426df43d668699b",
    "6d42156455748472b70bcee68c56fdc9262290e3a677d5dab46007a6aae5e88c",
    "5bf354dd427a94901c576cb475d27453060e15f24be7e3e74892ccd82069166a",
  ],
  "leaf-fall": [
    "5a1d18936652f430a1dfbcb969ad046d449bb7f94e4dd9a0346be9440ec9eb6e",
    "63fdf4627f016e103d19bde9e9cf3f87f6cc1f488bbb13ed682e0fa837925048",
  ],
  "autumn-warmth": [
    "95e2a46d8912e1d49285da54079473f7a884636c227c3c5399649367111df690",
    "8514ba072cfced5bb305642ad2ead03edbece57f51976dc3d5f8e63d29c63a92",
    "fb9350e39da0670caa097e72179100253196b125c6d2c5cc00cb3a2e2ae828f3",
  ],
  "red-square-autumn": [
    "cf293ed9fcba146e5f10b01bdc05596126677c781d7b48ac30578721c3bffd55",
    "d1633467c0e8f7df9c8ae7dda76b4b10b89303daf212e26f781f763d7dcce80a",
  ],
  "monochrome-character": [
    "277ded2f271bb8181f6079439f902df7d5b7619f6797a5cf461c1e949fc9cba1",
    "f13837b23716ed0f797e1320d80dca3af6c7eb57ae1452330951373242370e65",
    "33ae2fc1557e3deb948b9d2bd74f478b078381aa7ebffe874c4d111203193193",
  ],
};

test("only the twenty visually accepted packs are orderable", () => {
  assert.deepEqual(
    photoPacks.map((pack) => pack.id),
    ["autumn-promenade", "misty-morning", "golden-field", "black-minimalism", "scarlet-accent", "turquoise-wave", "pink-manifesto", "make-a-wish", "first-impression", "quiet-confidence", "petersburg-walk-v2", "golden-reflection", "scarlet-accent-2", "autumn-lake", "autumn-route", "misty-cabin", "leaf-fall", "autumn-warmth", "red-square-autumn", "monochrome-character"],
  );

  for (const pack of photoPacks) {
    const expectedCount = { "golden-reflection": 8, "autumn-lake": 5, "autumn-route": 2, "leaf-fall": 2, "autumn-warmth": 3, "red-square-autumn": 2, "monochrome-character": 3 }[pack.id] ?? 4;
    assert.equal(pack.photoCount, expectedCount);
    assert.equal(pack.gallery.length, expectedCount);
    const expectedModel = ["black-minimalism", "first-impression", "quiet-confidence", "autumn-lake", "monochrome-character"].includes(pack.id)
      ? "model-c"
      : ["scarlet-accent", "turquoise-wave", "pink-manifesto", "make-a-wish", "golden-reflection", "scarlet-accent-2", "autumn-route", "misty-cabin", "leaf-fall", "autumn-warmth", "red-square-autumn"].includes(pack.id)
        ? "model-b"
        : "model-a";
    assert.ok(pack.gallery.every((path) => path.includes(`-${expectedModel}-hc00`)));
    assert.equal(pack.image, pack.gallery[0]);
  }
});

test("new mini packs keep approved counts, covers and economy", () => {
  const expected = {
    "leaf-fall": { count: 2, rubles: 99, crystals: 20, cover: "sp027-leaf-fall-model-b-hc001.jpg" },
    "autumn-warmth": { count: 3, rubles: 139, crystals: 28, cover: "sp028-autumn-warmth-model-b-hc002.jpg" },
    "red-square-autumn": { count: 2, rubles: 99, crystals: 20, cover: "sp029-red-square-autumn-model-b-hc002.jpg" },
    "monochrome-character": { count: 3, rubles: 139, crystals: 28, cover: "sp030-monochrome-character-model-c-hc002.jpg" },
  };

  for (const [styleId, contract] of Object.entries(expected)) {
    const metadata = photoPacks.find((pack) => pack.id === styleId);
    const prompts = getShortNanoPackDefinition(styleId);
    assert.ok(metadata);
    assert.ok(prompts);
    assert.equal(metadata.photoCount, contract.count);
    assert.equal(metadata.gallery.length, contract.count);
    assert.equal(prompts.heroCompositions.length, contract.count);
    assert.equal(metadata.priceRub, contract.rubles);
    assert.equal(metadata.priceCrystals, contract.crystals);
    assert.ok(metadata.image.endsWith(contract.cover));
  }
});
test("legacy packs are hidden from ordering but remain resolvable for history", () => {
  assert.equal(getPhotoPack("dating"), undefined);
  assert.equal(getPhotoPack("studio"), undefined);
  assert.equal(getPhotoPack("neon"), undefined);
  assert.equal(getPhotoPackForHistory("dating")?.id, "dating");
  assert.equal(getPhotoPackForHistory("studio")?.id, "studio");
  assert.equal(getPhotoPackForHistory("neon")?.id, "neon");
});

test("short Nano packs preserve all recorded approved prompts byte-for-byte", () => {
  assert.equal(SHORT_NANO_PACK_REFERENCE_COUNT, 1);
  assert.equal(shortNanoPackDefinitions.length, 20);

  for (const [styleId, hashes] of Object.entries(expectedPromptHashes)) {
    const pack = getShortNanoPackDefinition(styleId);
    assert.ok(pack);
    assert.equal(pack.heroCompositions.length, hashes.length);
    assert.deepEqual(
      pack.heroCompositions.map(({ heroCompositionId }) => heroCompositionId),
      hashes.map((_hash, index) => `HC-${String(index + 1).padStart(3, "0")}`),
    );

    for (const [index, hero] of pack.heroCompositions.entries()) {
      const actual = createHash("sha256").update(hero.prompt, "utf8").digest("hex");
      assert.equal(actual, hashes[index]);
      assert.equal(hero.promptSha256, hashes[index]);
    }
  }
});

test("accepted birthday pack keeps one ordinary candle without age markers", () => {
  const pack = getShortNanoPackDefinition("make-a-wish");
  assert.ok(pack);
  for (const hero of pack.heroCompositions) {
    assert.match(hero.prompt, /одна обычная тонкая/);
    assert.match(hero.prompt, /без цифр, возраста и надписей/);
  }
});


test("SP-025 keeps its approved two-frame contract", () => {
  const pack = getShortNanoPackDefinition("autumn-route");
  assert.ok(pack);
  assert.equal(pack.heroCompositions.length, 2);
  assert.deepEqual(pack.heroCompositions.map(({ heroCompositionId }) => heroCompositionId), ["HC-001", "HC-002"]);
  assert.equal(pack.heroCompositions[0].promptSha256, "a989b1179e586aa360565c4fbb10a20f318b26bd762a664621e4b319b2d3ac51");
  assert.equal(pack.heroCompositions[1].promptSha256, "cec2d5e9a7f2c64ade2d6c1c8b3c3a6d5c1efbcbf77dbf92f12aab88e4d67351");
  assert.equal(pack.heroCompositions.some(({ heroCompositionId }) => heroCompositionId === "HC-003"), false);
  assert.equal(pack.heroCompositions.some(({ heroCompositionId }) => heroCompositionId === "HC-004"), false);
  const metadata = photoPacks.find(({ id }) => id === "autumn-route");
  assert.equal(metadata?.photoCount, 2);
  assert.equal(metadata?.gallery.length, 2);
});

test("SP-026 keeps knitted knee-high socks in every HC", () => {
  const pack = getShortNanoPackDefinition("misty-cabin");
  assert.ok(pack);
  assert.equal(pack.heroCompositions.length, 4);
  for (const hero of pack.heroCompositions) assert.match(hero.prompt, /вязаные гольфы/);
  assert.doesNotMatch(pack.heroCompositions[1].prompt, /Без гольфов, носков и обуви/);
});

test("adapter gives new packs an isolated one-reference Nano path", async () => {
  const source = await readFile(
    new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /isShortNanoPack \? NANO_BANANA_2_MODEL_ID : getAiGenerationModel\(\)/);
  assert.match(source, /isShortNanoPack \? SHORT_NANO_PACK_REFERENCE_COUNT : options\.referenceCount/);
  assert.match(source, /isShortNanoPack\s*\? generation\.scenePackage\s*:\s*buildMvpPromptWithScenePackage/);
  assert.match(source, /const shortNanoPackPrompts = getShortNanoPackPrompts\(photoshoot\.style_id\)/);
  assert.ok(
    source.indexOf("if (isShortNanoPackStyle(photoshoot.style_id)) return true;")
      < source.indexOf("if (options.scenePrompt) return false;"),
    "saved short-pack prompts must win over request-time scenePrompt overrides",
  );
});

test("catalog contains no placeholder or archived cards", async () => {
  const source = await readFile(
    new URL("../src/components/CatalogSection.tsx", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /placeholderCards/);
  assert.match(source, /const catalogCards = realCards/);
  assert.match(source, /autumn-promenade/);
  assert.match(source, /misty-morning/);
  assert.match(source, /golden-field/);
  assert.match(source, /scarlet-accent/);
  assert.match(source, /turquoise-wave/);
  assert.match(source, /pink-manifesto/);
  assert.match(source, /make-a-wish/);
  assert.match(source, /golden-reflection/);
  assert.match(source, /scarlet-accent-2/);
  assert.match(source, /autumn-lake/);
  assert.match(source, /autumn-route/);
  assert.match(source, /misty-cabin/);
  assert.match(source, /leaf-fall/);
  assert.match(source, /autumn-warmth/);
  assert.match(source, /red-square-autumn/);
  assert.match(source, /monochrome-character/);
});
