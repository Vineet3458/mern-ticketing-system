import { logger } from '../utils/logger.js';

// Asynchronous in-memory worker queue with retry support
class AsyncEmailQueue {
  constructor() {
    this.jobs = [];
    this.isProcessing = false;
    this.handler = null;
  }

  setHandler(fn) {
    this.handler = fn;
  }

  async add(name, data, options = {}) {
    const job = {
      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name,
      data,
      attempts: 0,
      maxAttempts: options.attempts || 3,
      delay: options.delay || 0,
    };
    this.jobs.push(job);
    logger.info(`[EmailQueue] Job queued: ${name} (id: ${job.id})`);
    this.processNext();
    return job;
  }

  async processNext() {
    if (this.isProcessing || this.jobs.length === 0) return;
    this.isProcessing = true;

    const job = this.jobs.shift();
    if (!job) {
      this.isProcessing = false;
      return;
    }

    try {
      job.attempts += 1;
      if (this.handler) {
        await this.handler(job);
      }
      logger.info(`[EmailQueue] Completed job ${job.id} (${job.name})`);
    } catch (err) {
      logger.error(`[EmailQueue] Error executing job ${job.id} (attempt ${job.attempts}):`, err.message);
      if (job.attempts < job.maxAttempts) {
        const backoffMs = Math.pow(2, job.attempts) * 1000;
        logger.info(`[EmailQueue] Retrying job ${job.id} in ${backoffMs}ms`);
        setTimeout(() => {
          this.jobs.push(job);
          this.processNext();
        }, backoffMs);
      } else {
        logger.error(`[EmailQueue] Job ${job.id} failed after ${job.maxAttempts} attempts`);
      }
    } finally {
      this.isProcessing = false;
      if (this.jobs.length > 0) {
        setImmediate(() => this.processNext());
      }
    }
  }
}

export const emailQueue = new AsyncEmailQueue();
