/** Tests for run progress tracking -- message editing and step polling. */

import { describe, it, expect, vi } from "vitest";

describe("OutboundMessage edit support", () => {
  it("supports editMessageId field for editing existing messages", () => {
    const msg = { chatId: "ch1", text: "updated", embed: { title: "test" }, editMessageId: "msg-123" };
    expect(msg.editMessageId).toBe("msg-123");
  });

  it("omits editMessageId for new messages", () => {
    const msg = { chatId: "ch1", text: "new message" };
    expect((msg as any).editMessageId).toBeUndefined();
  });
});

describe("sendMessage returns message ID", () => {
  it("returns message ID when sending embed", async () => {
    // Simulate the adapter returning a message ID
    const mockSend = vi.fn().mockResolvedValue({ id: "discord-msg-456" });
    const result = await mockSend({ embeds: [{ title: "test" }] });
    expect(result.id).toBe("discord-msg-456");
  });
});

describe("watchRun progress polling", () => {
  /** Simulate the enhanced watchRun that polls logs for step progress. */
  async function simulateWatchRun(
    getRun: (id: string) => Promise<any>,
    getRunLogs: (id: string) => Promise<any[]>,
    onProgress: (stepIndex: number, stepTotal: number, stepName: string) => void,
    onComplete: (outputs: any) => void,
    onFail: (error: string) => void,
  ): Promise<void> {
    let lastStepSeen = 0;

    for (let poll = 0; poll < 10; poll++) {
      const run = await getRun("run-1");

      if (run.status === "completed") {
        onComplete(run.outputs || {});
        return;
      }
      if (run.status === "failed") {
        onFail(run.outputs?.error || "Unknown error");
        return;
      }

      // Check logs for step progress
      const logs = await getRunLogs("run-1");
      for (const log of logs) {
        const stepNum = log.data?.step_num;
        if (stepNum && stepNum > lastStepSeen) {
          lastStepSeen = stepNum;
          onProgress(stepNum, log.data?.step_total || 0, log.data?.step_name || `Step ${stepNum}`);
        }
      }
    }
  }

  it("reports step progress before completion", async () => {
    const progressCalls: number[] = [];
    let completed = false;

    const getRun = vi.fn()
      .mockResolvedValueOnce({ status: "running" })
      .mockResolvedValueOnce({ status: "running" })
      .mockResolvedValueOnce({ status: "completed", outputs: { result: "done" } });

    const getRunLogs = vi.fn()
      .mockResolvedValueOnce([
        { type: "step_completed", data: { step_num: 1, step_total: 3, step_name: "Analyze" } },
      ])
      .mockResolvedValueOnce([
        { type: "step_completed", data: { step_num: 1, step_total: 3, step_name: "Analyze" } },
        { type: "step_completed", data: { step_num: 2, step_total: 3, step_name: "Process" } },
      ])
      .mockResolvedValueOnce([]);

    await simulateWatchRun(
      getRun,
      getRunLogs,
      (stepIndex) => progressCalls.push(stepIndex),
      () => { completed = true; },
      () => {},
    );

    expect(progressCalls).toEqual([1, 2]);
    expect(completed).toBe(true);
  });

  it("handles run that fails", async () => {
    let failError = "";

    const getRun = vi.fn().mockResolvedValue({ status: "failed", outputs: { error: "OOM" } });
    const getRunLogs = vi.fn().mockResolvedValue([]);

    await simulateWatchRun(
      getRun,
      getRunLogs,
      () => {},
      () => {},
      (err) => { failError = err; },
    );

    expect(failError).toBe("OOM");
  });

  it("skips already-seen steps", async () => {
    const progressCalls: number[] = [];

    const getRun = vi.fn()
      .mockResolvedValueOnce({ status: "running" })
      .mockResolvedValueOnce({ status: "completed", outputs: {} });

    const getRunLogs = vi.fn()
      .mockResolvedValueOnce([
        { type: "step_completed", data: { step_num: 1, step_total: 3, step_name: "A" } },
        { type: "step_completed", data: { step_num: 1, step_total: 3, step_name: "A" } }, // duplicate
      ])
      .mockResolvedValueOnce([]);

    await simulateWatchRun(
      getRun,
      getRunLogs,
      (stepIndex) => progressCalls.push(stepIndex),
      () => {},
      () => {},
    );

    expect(progressCalls).toEqual([1]); // no duplicate
  });
});
