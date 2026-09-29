import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adapter = await readFile(
  new URL("../src/lib/ai/mvp-generation-adapter.ts", import.meta.url),
  "utf8",
);

test("generation producer builds the exact credential-free webhook URL contract", () => {
  assert.match(
    adapter,
    /\/api\/webhooks\/replicate\/generation\?photoshootId=\$\{encodeURIComponent\(photoshoot\.id\)\}/,
  );
  assert.doesNotMatch(adapter, /generationphotoshootId/);

  const producerUrl = adapter.match(/const webhookUrl = `([^`]+)`;/)?.[1];
  assert.ok(producerUrl);
  assert.doesNotMatch(producerUrl, /[?&](?:secret|token|api[_-]?key|authorization|credential)=/i);
  assert.equal((producerUrl.match(/[?&]photoshootId=/g) ?? []).length, 1);
});
