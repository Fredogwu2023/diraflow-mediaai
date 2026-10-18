import test from "node:test";
import assert from "node:assert/strict";
import { assessDistributionReadiness } from "./distribution-readiness.js";

test("missing adapter is deferred and not processable", () => {
  const result = assessDistributionReadiness(undefined);

  assert.equal(result.event, "delivery_deferred_no_adapter");
  assert.equal(result.processable, false);
  assert.equal(
    result.reason,
    "No publishing adapter is registered; delivery remains queued."
  );
});

test("registered adapter is not considered ready to publish", () => {
  const adapter = {
    publish: async () => {
      throw new Error("The publisher must not be invoked by this test.");
    },
  };

  const result = assessDistributionReadiness(adapter);

  assert.equal(result.event, "delivery_deferred_processing_unimplemented");
  assert.equal(result.processable, false);
  assert.match(result.reason, /claiming and publishing are not implemented/);
});