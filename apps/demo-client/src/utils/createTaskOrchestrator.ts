interface TaskConfig {
  interval: number;
  onlyWhenVisible?: boolean;
  immediate?: boolean;
}

// Core utilities
const createVisibilityTracker = () => {
  let isVisible = !document.hidden;
  const listeners = new Set<(visible: boolean) => void>();

  const handleVisibilityChange = () => {
    isVisible = !document.hidden;
    listeners.forEach((fn) => fn(isVisible));
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);

  return {
    isVisible: () => isVisible,
    onChange: (fn: (visible: boolean) => void) => {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    cleanup: () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      listeners.clear();
    },
  };
};

const createTimer = (fn: () => void, interval: number) => {
  let timerId: NodeJS.Timeout | undefined;

  const start = () => {
    if (timerId) return;
    timerId = setInterval(fn, interval);
  };

  const stop = () => {
    if (timerId) {
      clearInterval(timerId);
      timerId = undefined;
    }
  };

  return { start, stop, isRunning: () => !!timerId };
};

// Main scheduler function
const scheduleTask = (fn: () => Promise<unknown>, options: TaskConfig) => {
  const visibility = createVisibilityTracker();
  const controller = new AbortController();

  const safeExecute = async () => {
    if (controller.signal.aborted) return;
    if (options.onlyWhenVisible && !visibility.isVisible()) return;

    try {
      await fn();
    } catch (error) {
      console.error("Task failed:", error);
    }
  };

  const timer = createTimer(safeExecute, options.interval);

  // Handle visibility changes
  const unsubscribe = visibility.onChange((visible) => {
    if (options.onlyWhenVisible) {
      if (visible) timer.start();
      else timer.stop();
    }
  });

  // Start timer only if not onlyWhenVisible or if currently visible
  if (!options.onlyWhenVisible || visibility.isVisible()) {
    timer.start();
  }

  // Start immediately if requested
  if (options.immediate !== false) {
    safeExecute();
  }

  return {
    cancel: () => {
      controller.abort();
      timer.stop();
      unsubscribe();
      visibility.cleanup();
    },
    pause: () => timer.stop(),
    resume: () => timer.start(),
  };
};

export { scheduleTask };
export type { TaskConfig };

// Usage example:
// const task = scheduleTask(() => fetch("/api/data").then((r) => r.json()), {
//   interval: 10_000,
//   onlyWhenVisible: true,
// });
