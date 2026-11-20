export function resolveD00ApprovedRun(config: string | undefined, input: {
  research_intent: string;
  scope: Record<string, unknown>;
  consumer_method_plan: { methods: { method_id: string; method_version: string }[] };
}): string | null;
