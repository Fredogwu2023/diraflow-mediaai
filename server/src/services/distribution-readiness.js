export function assessDistributionReadiness(adapter) {
  if (!adapter) {
    return {
      event: "delivery_deferred_no_adapter",
      processable: false,
      reason: "No publishing adapter is registered; delivery remains queued.",
    };
  }

  return {
    event: "delivery_deferred_processing_unimplemented",
    processable: false,
    reason:
      "A platform adapter is registered, but claiming and publishing are not implemented.",
  };
}