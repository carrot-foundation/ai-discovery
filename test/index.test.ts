import { describe, expect, it } from "vitest";
import { identity, mdMirror, robots } from "../src/index.js";

describe("root barrel", () => {
  it("re-exports the bot registry helpers", () => {
    expect(robots.AI_BOT_INTENTS).toContain("agent");
    expect(robots.AI_AGENTS.map((a) => a.name)).toContain("Google-Agent");
    expect(robots.classifyUserAgent).toBeTypeOf("function");
    expect(robots.findByVercelBotName).toBeTypeOf("function");
  });

  it("re-exports Markdown negotiation", () => {
    expect(mdMirror.prefersMarkdown("text/markdown")).toBe(true);
  });

  it("re-exports the canonical Carrot identity", () => {
    expect(identity.carrotOrganization()["@id"]).toBe(
      identity.CARROT_ORGANIZATION.id,
    );
    expect(identity.carrotFounder()["@id"]).toBe(identity.CARROT_FOUNDER.id);
  });
});
