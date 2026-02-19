export function createTimer() {
  let startTime: number | null = null;
  let accumulatedTime = 0;

  return {
    start: () => {
      if (startTime === null) startTime = Date.now();
    },
    stop: () => {
      if (startTime !== null) {
        accumulatedTime += Date.now() - startTime;
        startTime = null;
      }
      return accumulatedTime;
    },
    reset: () => {
      startTime = Date.now();
      accumulatedTime = 0;
    },
    clear: () => {
      startTime = null;
      accumulatedTime = 0;
    },
    getTime: () => {
      if (startTime !== null) {
        return accumulatedTime + (Date.now() - startTime);
      }
      return accumulatedTime;
    },
  };
}
