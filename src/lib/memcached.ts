/**
 * @leizm/cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { CacheStore } from "./common";
import * as memjs from "memjs";

export interface MemcachedStoreOptions extends memjs.ClientOptions {
  server: string;
}

export class MemcachedStore implements CacheStore {
  protected readonly client: memjs.Client;

  constructor(options: MemcachedStoreOptions) {
    this.client = memjs.Client.create(options.server, { ...(options as any) });
  }

  public async get(key: string): Promise<string | null> {
    return this.getBuffer(key).then(ret => (ret ? ret.toString() : null));
  }

  public getBuffer(key: string): Promise<Buffer | null> {
    return new Promise((resolve, reject) => {
      this.client.get(key, (err, ret) => {
        if (err) return reject(err);
        resolve(ret || null);
      });
    });
  }

  public async setex(key: string, ttl: number, data: string | Buffer): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.set(key, data, { expires: ttl }, (err, ret) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  public async del(key: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.client.delete(key, (err, ret) => {
        if (err) return reject(err);
        resolve();
      });
    });
  }

  public disconnect(): void {
    this.client.close();
  }
}
