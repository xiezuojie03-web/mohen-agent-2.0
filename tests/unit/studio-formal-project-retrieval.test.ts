import {expect, it} from "vitest";
import {retrieveQualifiedFormalProject} from "../../apps/web/lib/mohen-agent/retrieve-formal";

it("accepts a five-group project UUID and rejects truncated or out-of-scope IDs", async () => {
  const projectId = "14b380df-e7cc-477e-a020-bd2786d34af0";
  const qualification = {
    consumer: "agent" as const,
    purpose: {namespace: "mohen.research", code: "agent_read", version: "1"},
    scope: {requested_action: "read", project_id: projectId},
  };

  await expect(retrieveQualifiedFormalProject(projectId, [], qualification, "test-session"))
    .resolves.toMatchObject({projectQualifiedCoverage: "NOT_SEARCHED"});
  await expect(retrieveQualifiedFormalProject("14b380df-e7cc-477e-bd2786d34af0", [], qualification, "test-session"))
    .rejects.toThrow("STUDIO_PROJECT_REQUIRED");
  await expect(retrieveQualifiedFormalProject("14b380df-e7cc-477e-a020-bd2786d34af1", [], qualification, "test-session"))
    .rejects.toThrow("FORMAL_PROJECT_READ_CONTEXT_REQUIRED");
});
