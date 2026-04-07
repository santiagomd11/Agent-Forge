import { describe, it, expect } from "vitest";
import {
  greetingEmbed,
  agentListEmbed,
  runStartedEmbed,
  progressEmbed,
  runCompletedEmbed,
  runFailedEmbed,
  statusEmbed,
  machinesEmbed,
  helpEmbed,
  errorEmbed,
  progressBar,
} from "../src/embeds.js";

describe("embeds", () => {
  describe("progressBar", () => {
    it("shows empty bar for 0 progress", () => {
      expect(progressBar(0, 5)).toMatch(/^[\u25AB]+$/);
    });

    it("shows full bar for complete", () => {
      expect(progressBar(5, 5)).toMatch(/^[\u25AA]+$/);
    });

    it("shows partial bar", () => {
      const bar = progressBar(3, 6);
      expect(bar).toContain("\u25AA");
      expect(bar).toContain("\u25AB");
      expect(bar).toHaveLength(10);
    });

    it("handles zero total", () => {
      expect(progressBar(0, 0)).toMatch(/^[\u25AB]+$/);
    });

    it("supports custom length", () => {
      expect(progressBar(5, 5, 20)).toHaveLength(20);
    });
  });

  describe("greetingEmbed", () => {
    it("has author set to Vadgr", () => {
      const embed = greetingEmbed("Santiago", [], []);
      expect(embed.toJSON().author?.name).toBe("Vadgr");
    });

    it("creates embed with agents listed in description", () => {
      const embed = greetingEmbed(
        "Santiago",
        [
          { name: "security", machineName: "laptop", steps: [{ name: "s1" }], description: "Audits code" },
          { name: "software", steps: [{ name: "s1" }, { name: "s2" }] },
        ],
        [{ name: "laptop", agentCount: 1 }],
      );
      const json = embed.toJSON();
      expect(json.title).toContain("Santiago");
      expect(json.description).toContain("security");
      expect(json.description).toContain("software");
    });

    it("shows machines section when machines present", () => {
      const embed = greetingEmbed(
        "Santiago",
        [{ name: "security", steps: [] }],
        [{ name: "laptop", agentCount: 2 }],
      );
      const json = embed.toJSON();
      expect(json.description).toContain("laptop");
    });

    it("shows 'no agents' when empty", () => {
      const embed = greetingEmbed("Santiago", [], []);
      expect(embed.toJSON().description).toContain("No agents");
    });

    it("has footer with available commands", () => {
      const embed = greetingEmbed("Santiago", [], []);
      expect(embed.toJSON().footer?.text).toContain("/run");
    });
  });

  describe("agentListEmbed", () => {
    it("lists agents in description with formatting", () => {
      const embed = agentListEmbed([
        { name: "security", description: "Audits code", machineName: "laptop", steps: [{ name: "s1" }] },
        { name: "data", description: "Analyzes data" },
      ]);
      const json = embed.toJSON();
      expect(json.description).toContain("security");
      expect(json.description).toContain("Audits code");
      expect(json.description).toContain("data");
    });

    it("handles empty list", () => {
      const embed = agentListEmbed([]);
      expect(embed.toJSON().description).toContain("No agents");
    });

    it("truncates long lists", () => {
      const agents = Array.from({ length: 30 }, (_, i) => ({ name: `agent-${i}` }));
      const embed = agentListEmbed(agents);
      // Description should not be insanely long
      expect(embed.toJSON().description!.length).toBeLessThan(4096);
    });

    it("shows machine name when present", () => {
      const embed = agentListEmbed([{ name: "sec", machineName: "laptop" }]);
      expect(embed.toJSON().description).toContain("laptop");
    });
  });

  describe("runStartedEmbed", () => {
    it("shows agent name in title and run ID", () => {
      const embed = runStartedEmbed("security", "abcdef1234567890", "laptop");
      const json = embed.toJSON();
      expect(json.title).toContain("security");
      expect(json.description).toContain("abcdef12");
      expect(json.color).toBe(0xeab308);
    });

    it("shows machine name when provided", () => {
      const embed = runStartedEmbed("security", "abcdef12", "laptop");
      expect(embed.toJSON().description).toContain("laptop");
    });

    it("works without machine name", () => {
      const embed = runStartedEmbed("security", "abcdef12");
      expect(embed.toJSON().title).toContain("security");
    });

    it("includes progress bar", () => {
      const embed = runStartedEmbed("security", "abcdef12");
      expect(embed.toJSON().description).toContain("\u25AB");
    });
  });

  describe("progressEmbed", () => {
    it("shows step progress with bar", () => {
      const embed = progressEmbed("security", "abc123", 3, 5, "Scanning deps", "laptop");
      const json = embed.toJSON();
      expect(json.description).toContain("3/5");
      expect(json.description).toContain("Scanning deps");
      expect(json.description).toContain("\u25AA");
      expect(json.color).toBe(0xeab308);
    });
  });

  describe("runCompletedEmbed", () => {
    it("shows success with outputs", () => {
      const embed = runCompletedEmbed("security", "abc123", {
        findings: "2 critical, 5 warnings",
        report: "output/report.pdf",
      });
      const json = embed.toJSON();
      expect(json.title).toContain("finished");
      expect(json.color).toBe(0x22c55e);
      expect(json.fields).toHaveLength(2);
    });

    it("skips long outputs", () => {
      const embed = runCompletedEmbed("security", "abc123", {
        short: "ok",
        long: "x".repeat(600),
      });
      expect(embed.toJSON().fields).toHaveLength(1);
    });

    it("includes full progress bar", () => {
      const embed = runCompletedEmbed("security", "abc123", {});
      expect(embed.toJSON().description).toContain("\u25AA");
    });
  });

  describe("runFailedEmbed", () => {
    it("shows error and resume hint", () => {
      const embed = runFailedEmbed("security", "abc12345", "Timeout in step 3");
      const json = embed.toJSON();
      expect(json.title).toContain("failed");
      expect(json.color).toBe(0xef4444);
      expect(json.description).toContain("Timeout");
      expect(json.description).toContain("resume");
    });
  });

  describe("statusEmbed", () => {
    it("shows runs with status icons", () => {
      const embed = statusEmbed([
        { id: "run1abcd", agent_name: "security", status: "completed" },
        { id: "run2defg", agent_name: "data", status: "failed" },
        { id: "run3ghij", agent_name: "software", status: "running" },
      ]);
      const desc = embed.toJSON().description!;
      expect(desc).toContain("security");
      expect(desc).toContain("data");
      expect(desc).toContain("software");
      expect(desc).toContain("completed");
      expect(desc).toContain("failed");
      expect(desc).toContain("running");
    });

    it("shows idle message when no runs", () => {
      const embed = statusEmbed([]);
      expect(embed.toJSON().description).toContain("idle");
    });
  });

  describe("machinesEmbed", () => {
    it("shows connected machines in description", () => {
      const embed = machinesEmbed([
        { name: "laptop", agentCount: 3, connectedAt: new Date(), activeRuns: 1 },
      ]);
      const json = embed.toJSON();
      expect(json.description).toContain("laptop");
      expect(json.description).toContain("3 agents");
    });

    it("shows message when no machines", () => {
      const embed = machinesEmbed([]);
      expect(embed.toJSON().description).toContain("No machines");
    });
  });

  describe("helpEmbed", () => {
    it("includes all command descriptions", () => {
      const embed = helpEmbed();
      const desc = embed.toJSON().description!;
      expect(desc).toContain("/run");
      expect(desc).toContain("/agents");
      expect(desc).toContain("/status");
      expect(desc).toContain("/cancel");
      expect(desc).toContain("/logs");
      expect(desc).toContain("/machines");
    });
  });

  describe("errorEmbed", () => {
    it("shows error with red color", () => {
      const embed = errorEmbed("Oops", "Something went wrong");
      const json = embed.toJSON();
      expect(json.color).toBe(0xef4444);
      expect(json.title).toBe("Oops");
    });
  });
});
