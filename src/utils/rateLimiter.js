export class RateLimiter {
  constructor(requestsPerInterval, intervalDuration) {
    this.requestsPerInterval = requestsPerInterval; //100 requests
    this.intervalDuration = intervalDuration; //15min intervals
    this.lastResetTime = Date.now();
    this.tokens = this.requestsPerInterval;
  }

  async request() {
    // Calculate time since last reset
    const currentTime = Date.now();
    const elapsedTime = currentTime - this.lastResetTime;

    // Refill tokens based on elapsed time
    const tokensToAdd = (elapsedTime / this.intervalDuration) * this.requestsPerInterval;
    this.tokens = Math.min(this.requestsPerInterval, this.tokens + tokensToAdd);

    // Check if there are enough tokens for the request
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    } else {
      // Not enough tokens, wait until next interval
      const waitTime = this.intervalDuration - (elapsedTime % this.intervalDuration);
      await sleep(waitTime);
      this.lastResetTime = Date.now();
      this.tokens = this.requestsPerInterval - 1;
      return true;
    }
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
