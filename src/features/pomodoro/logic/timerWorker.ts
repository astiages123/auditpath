let timer: ReturnType<typeof setInterval> | null = null;

export type TimerWorkerMessage = 'START' | 'STOP';

self.onmessage = (e: MessageEvent<TimerWorkerMessage>) => {
  const messageData = e.data;

  if (messageData === 'START') {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      self.postMessage('TICK');
    }, 1000);
  } else if (messageData === 'STOP') {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
};
