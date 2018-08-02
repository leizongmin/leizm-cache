/**
 * @leizm/cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { CacheStore } from "./common";
import * as Redis from "ioredis";

export interface RedisStoreOptions extends Redis.RedisOptions {}

export class RedisStore implements CacheStore {
  protected readonly client: Redis.Redis;

  constructor(options: RedisStoreOptions) {
    this.client = new Redis(options);
  }

  public get(key: string): Promise<string | null> {
    return this.client.get(key) as any;
  }

  public getBuffer(key: string): Promise<Buffer | null> {
    return this.client.getBuffer(key) as any;
  }

  public async setex(key: string, ttl: number, data: string | Buffer): Promise<void> {
    return this.client.setex(key, ttl, data) as any;
  }

  public async del(key: string): Promise<void> {
    return this.client.del(key);
  }

  public disconnect(): void {
    this.client.disconnect();
  }
}
