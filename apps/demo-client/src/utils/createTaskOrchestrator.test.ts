import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { scheduleTask } from "./createTaskOrchestrator";

describe("createTaskOrchestrator", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("createVisibilityTracker", () => {
    it("should initialize with visible state", () => {
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });

      expect(mockFn).not.toHaveBeenCalled();
      task.cancel();
    });

    it("should handle visibility changes", () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: false,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: true,
        immediate: false 
      });

      // Simulate tab becoming hidden
      Object.defineProperty(document, "hidden", { value: true });
      document.dispatchEvent(new Event("visibilitychange"));

      vi.advanceTimersByTime(1000);
      expect(mockFn).not.toHaveBeenCalled();

      // Simulate tab becoming visible again
      Object.defineProperty(document, "hidden", { value: false });
      document.dispatchEvent(new Event("visibilitychange"));

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.cancel();
    });

    it("should cleanup event listeners on cancel", () => {
      const removeEventListenerSpy = vi.spyOn(document, "removeEventListener");
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000 });

      task.cancel();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });

  describe("createTimer", () => {
    it("should execute function at specified intervals", () => {
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      task.cancel();
    });

    it("should pause and resume timer", () => {
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.pause();
      vi.advanceTimersByTime(2000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.resume();
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      task.cancel();
    });

    it("should stop timer on cancel", () => {
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });

      task.cancel();
      vi.advanceTimersByTime(2000);
      expect(mockFn).not.toHaveBeenCalled();
    });
  });

  describe("scheduleTask", () => {
    it("should execute immediately when immediate is not false", () => {
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000 });

      // Should execute immediately (synchronously)
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.cancel();
    });

    it("should not execute immediately when immediate is false", () => {
      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });

      expect(mockFn).not.toHaveBeenCalled();

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.cancel();
    });

    it("should handle async function errors gracefully", async () => {
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const mockFn = vi.fn().mockRejectedValue(new Error("Test error"));
      
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });

      vi.advanceTimersByTime(1000);
      await vi.runOnlyPendingTimersAsync();

      expect(consoleErrorSpy).toHaveBeenCalledWith("Task failed:", expect.any(Error));
      
      consoleErrorSpy.mockRestore();
      task.cancel();
    });

    it("should not start timer when onlyWhenVisible is true and document is hidden", () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: true,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: true,
        immediate: false 
      });

      // Timer should not be running, so advancing time should not execute the function
      vi.advanceTimersByTime(2000);
      expect(mockFn).not.toHaveBeenCalled();

      task.cancel();
    });

    it("should start timer when onlyWhenVisible is true and document is visible", () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: false,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: true,
        immediate: false 
      });

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.cancel();
    });

    it("should start timer normally when onlyWhenVisible is false", () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: true,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: false,
        immediate: false 
      });

      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      task.cancel();
    });

    it("should not execute when aborted", async () => {
      const mockFn = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return "result";
      });
      
      const task = scheduleTask(mockFn, { interval: 1000, immediate: false });
      
      task.cancel();
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();

      expect(mockFn).not.toHaveBeenCalled();
    });

    it("should not execute when onlyWhenVisible is true and document is hidden during execution", async () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: true,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: true,
        immediate: true 
      });

      // Wait for any immediate execution attempts
      await vi.runOnlyPendingTimersAsync();
      expect(mockFn).not.toHaveBeenCalled();

      task.cancel();
    });
  });

  describe("integration scenarios", () => {
    it("should handle complex visibility and timer interactions", () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: false,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: true,
        immediate: false 
      });

      // Should execute when visible
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Hide the document
      Object.defineProperty(document, "hidden", { value: true });
      document.dispatchEvent(new Event("visibilitychange"));

      // Should not execute when hidden
      vi.advanceTimersByTime(2000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Show the document again
      Object.defineProperty(document, "hidden", { value: false });
      document.dispatchEvent(new Event("visibilitychange"));

      // Should resume execution
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      task.cancel();
    });

    it("should handle pause/resume with visibility changes", () => {
      Object.defineProperty(document, "hidden", {
        writable: true,
        value: false,
      });

      const mockFn = vi.fn();
      const task = scheduleTask(mockFn, { 
        interval: 1000, 
        onlyWhenVisible: true,
        immediate: false 
      });

      // Execute once
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Manually pause
      task.pause();
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Hide document while paused
      Object.defineProperty(document, "hidden", { value: true });
      document.dispatchEvent(new Event("visibilitychange"));

      // Resume - should not start because document is hidden
      task.resume();
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Show document - should start timer
      Object.defineProperty(document, "hidden", { value: false });
      document.dispatchEvent(new Event("visibilitychange"));
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(2);

      task.cancel();
    });
  });
});