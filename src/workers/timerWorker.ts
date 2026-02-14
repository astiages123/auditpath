let timer: ReturnType<typeof setInterval> | null = null;

self.onmessage = (e: MessageEvent) => {
  if (e.data === "START") {
    if (timer) clearInterval(timer);
    timer = setInterval(() => {
      self.postMessage("TICK");
    }, 1000);
  } else if (e.data === "STOP") {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }
};
