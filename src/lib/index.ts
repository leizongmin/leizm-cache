/**
 * @leizm/cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import * as Redis from "ioredis";

export interface CacheOptions {
  /** Redis连接信息 */
  redis: Redis.RedisOptions;
  /** 缓存时间，单位：秒 */
  ttl: number;
}

/** 缓存数据 */
export type CacheData = any;

/** 从数据源查询数据的函数 */
export type QueryOriginalFunction = (key: string) => Promise<CacheData>;

interface AsyncTask {
  resolve(a: any): void;
  reject(a: any): void;
  wait(): Promise<any>;
}

export class Cache {
  public readonly redis: Redis.Redis;
  protected readonly pendingTask: Map<string, AsyncTask[]> = new Map();

  constructor(public readonly options: CacheOptions) {
    this.redis = new Redis(options.redis);
  }

  protected createAsyncTask(): AsyncTask {
    const task = {
      $reject: (a: any) => {},
      $resolve: (a: any) => {},
      resolve: (a: any) => task.$resolve(a),
      reject: (a: any) => task.$reject(a),
      wait: () =>
        new Promise((resolve, reject) => {
          task.$resolve = resolve;
          task.$reject = reject;
        }),
    };
    return task;
  }

  /**
   * 查询缓存数据，如果不存在则先调用指定方法查询，并缓存起来
   */
  public async get(
    key: string,
    queryOriginal?: QueryOriginalFunction,
    ttl: number = this.options.ttl,
  ): Promise<CacheData> {
    const current = await this.redis.get(key);
    if (current) return JSON.parse(current);
    if (!queryOriginal) return;

    // 需要从数据源查询
    if (this.pendingTask.has(key)) {
      const list = this.pendingTask.get(key)!;
      const task = this.createAsyncTask();
      list.push(task);
      this.pendingTask.set(key, list);
      const data = await task.wait();
      return data;
    } else {
      try {
        this.pendingTask.set(key, []);
        const data = await queryOriginal(key);
        await this.set(key, data, ttl);
        const list = this.pendingTask.get(key)!;
        this.pendingTask.delete(key);
        list.forEach(task => task.resolve(data));
        return data;
      } catch (err) {
        const list = this.pendingTask.get(key)!;
        this.pendingTask.delete(key);
        list.forEach(task => task.reject(err));
        throw err;
      }
    }
  }

  /**
   * 设置缓存
   */
  public async set(key: string, data: CacheData, ttl: number = this.options.ttl): Promise<void> {
    await this.redis.setex(key, ttl, JSON.stringify(data));
  }

  /**
   * 删除缓存
   */
  public async delete(key: string): Promise<void> {
    await this.redis.del(key);
  }

  /**
   * 定义查询指定缓存的方法
   */
  public define(
    key: string,
    queryOriginal: QueryOriginalFunction,
    ttl: number = this.options.ttl,
  ): (() => Promise<CacheData>) {
    return async () => {
      return this.get(key, queryOriginal, ttl);
    };
  }

  /**
   * 销毁
   */
  public destroy() {
    this.redis.disconnect();
    this.pendingTask.clear();
  }
}
