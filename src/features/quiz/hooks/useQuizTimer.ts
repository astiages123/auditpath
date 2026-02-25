export function createTimer() {
  let startTime: number | null = null;
  let accumulatedTime = 0;
  let isRunning = false;
  let isListenerAttached = false;

  const handleVisibilityChange = () => {
    if (
      document.visibilityState === 'hidden' &&
      isRunning &&
      startTime !== null
    ) {
      accumulatedTime += Date.now() - startTime;
      startTime = null;
      isRunning = false;
    } else if (
      document.visibilityState === 'visible' &&
      !isRunning &&
      startTime === null
    ) {
      startTime = Date.now();
      isRunning = true;
    }
  };

  const attachListener = () => {
    if (typeof document !== 'undefined' && !isListenerAttached) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
      isListenerAttached = true;
    }
  };

  const detachListener = () => {
    if (typeof document !== 'undefined' && isListenerAttached) {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      isListenerAttached = false;
    }
  };

  return {
    start: () => {
      attachListener();
      if (startTime === null) {
        startTime = Date.now();
        isRunning = true;
      }
    },
    stop: () => {
      if (startTime !== null) {
        accumulatedTime += Date.now() - startTime;
        startTime = null;
        isRunning = false;
      }
      return accumulatedTime;
    },
    reset: () => {
      attachListener();
      startTime = Date.now();
      accumulatedTime = 0;
      isRunning = true;
    },
    clear: () => {
      detachListener();
      startTime = null;
      accumulatedTime = 0;
      isRunning = false;
    },
    getTime: () => {
      if (startTime !== null) {
        return accumulatedTime + (Date.now() - startTime);
      }
      return accumulatedTime;
    },
  };
}
