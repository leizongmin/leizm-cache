/**
 * @leizm/cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { CacheStore } from "./common";

interface DataRow {
  expire: number;
  data: Buffer;
}

export interface InMemoryStoreOptions {
  /** 自动清理过期数据的检查周期，毫秒 */
  interval: number;
}

export class InMemoryStore implements CacheStore {
  protected data: Map<string, DataRow> = new Map();
  protected tid: NodeJS.Timer;

  constructor(protected readonly options: InMemoryStoreOptions) {
    this.tid = setInterval(() => {
      const now = Date.now();
      this.data.forEach((v, k) => {
        if (v.expire < now) {
          this.data.delete(k);
        }
      });
    }, this.options.interval);
  }

  public async get(key: string): Promise<string | null> {
    const item = this.data.get(key);
    if (!item) return null;
    return item.data.toString();
  }

  public async getBuffer(key: string): Promise<Buffer | null> {
    const item = this.data.get(key);
    if (!item) return null;
    return item.data;
  }

  public async setex(key: string, ttl: number, data: string | Buffer): Promise<void> {
    this.data.set(key, { expire: ttl * 1000 + Date.now(), data: Buffer.isBuffer(data) ? data : Buffer.from(data) });
  }

  public async delete(key: string): Promise<void> {
    this.data.delete(key);
  }

  public close(): void {
    clearInterval(this.tid);
    this.data.clear();
  }
}
