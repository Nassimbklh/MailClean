/**
 * Rate Limiter optimisé pour Gmail API
 * - Max concurrency: 3 requêtes en parallèle
 * - Pause 200ms entre chaque requête
 * - Compteur d'appels/minute
 */

export class GmailRateLimiter {
  private queue: Array<{ fn: () => Promise<any>; resolve: (value: any) => void; reject: (error: any) => void }> = [];
  private activeRequests = 0;
  private maxConcurrency = 3; // Max 3 requêtes en parallèle
  private minDelayMs = 200; // Pause 200ms entre chaque requête
  private lastRequestTime = 0;

  // Compteurs pour monitoring
  private requestsThisMinute = 0;
  private minuteStart = Date.now();

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    // Si on a atteint la concurrency max, attendre
    if (this.activeRequests >= this.maxConcurrency) {
      return;
    }

    // Si la queue est vide, rien à faire
    if (this.queue.length === 0) {
      return;
    }

    // Respecter le délai minimum entre requêtes
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.minDelayMs) {
      setTimeout(() => this.processQueue(), this.minDelayMs - timeSinceLastRequest);
      return;
    }

    // Prendre la prochaine requête de la queue
    const request = this.queue.shift();
    if (!request) return;

    this.activeRequests++;
    this.lastRequestTime = Date.now();
    this.requestsThisMinute++;

    // Réinitialiser le compteur chaque minute
    if (Date.now() - this.minuteStart > 60000) {
      console.log(`📊 [Gmail API] ${this.requestsThisMinute} requêtes dans la dernière minute`);
      this.requestsThisMinute = 0;
      this.minuteStart = Date.now();
    }

    try {
      const result = await request.fn();
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    } finally {
      this.activeRequests--;
      // Traiter la prochaine requête
      this.processQueue();
    }
  }

  getStats() {
    return {
      queueLength: this.queue.length,
      activeRequests: this.activeRequests,
      requestsThisMinute: this.requestsThisMinute,
    };
  }
}

// Instance globale
export const gmailRateLimiter = new GmailRateLimiter();
