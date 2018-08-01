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
  /** 数据编码器 */
  encoder?: DataEncoder;
  /** 数据解码器 */
  decoder?: DataDecoder;
}

/** 缓存数据 */
export type CacheData = any;

/** 数据编码器接口 */
export type DataEncoder = (data: any) => string;

/** 数据解码器 */
export type DataDecoder = (data: string) => any;

/** 默认数据编码器 */
export function defaultEncoder(data: any): string {
  return JSON.stringify(data);
}

/** 默认数据解码器 */
export function defaultDecoder(data: string): any {
  return JSON.parse(data);
}

/** 从数据源查询数据的函数 */
export type QueryOriginalFunction = (ctx: QueryOriginalContext) => Promise<CacheData>;

/**
 * 查询缓存函数Context
 */
export class QueryOriginalContext {
  constructor(public readonly key: string, public ttl: number) {}
}

/**
 * 异步任务
 */
export class AsyncTask<T = any> {
  protected $resolve?: (a: T) => void;
  protected $reject?: (a: any) => void;
  protected $promise: Promise<T>;
  constructor() {
    this.$promise = new Promise((resolve, reject) => {
      this.$resolve = resolve;
      this.$reject = reject;
    });
  }
  public resolve(a: T) {
    return this.$resolve!(a);
  }
  public reject(a: any) {
    return this.$reject!(a);
  }
  public wait(): Promise<T> {
    return this.$promise;
  }
}

/**
 * 缓存管理器
 */
export class Cache {
  protected readonly redis: Redis.Redis;
  protected readonly pendingTask: Map<string, AsyncTask[]> = new Map();
  protected readonly encode: DataEncoder;
  protected readonly decode: DataDecoder;

  constructor(public readonly options: CacheOptions) {
    this.redis = new Redis(options.redis);
    this.encode = options.encoder || defaultEncoder;
    this.decode = options.decoder || defaultDecoder;
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
    if (current) return this.decode(current);
    if (!queryOriginal) return;

    // 需要从数据源查询
    const ctx = new QueryOriginalContext(key, ttl);

    if (this.pendingTask.has(key)) {
      // 有并发的查询任务
      const list = this.pendingTask.get(key)!;
      const task = new AsyncTask();
      list.push(task);
      this.pendingTask.set(key, list);
      const data = await task.wait();
      return data;
    } else {
      // 从数据源查询
      try {
        this.pendingTask.set(key, []);
        const data = await queryOriginal(ctx);
        await this.set(key, data, ctx.ttl);
        const list = this.pendingTask.get(key)!;
        this.pendingTask.delete(key);
        // 保证返回的数据都是经过 encode 和 decode 处理的
        const retData = this.decode(this.encode(data));
        list.forEach(task => task.resolve(retData));
        return retData;
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
    await this.redis.setex(key, ttl, this.encode(data));
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
