/**
 * @leizm/cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { InMemoryStore, InMemoryStoreOptions } from "./memory";
import { MemcachedStore, MemcachedStoreOptions } from "./memcached";
import { RedisStore, RedisStoreOptions } from "./redis";
import {
  DataEncoder,
  DataDecoder,
  CacheStore,
  AsyncTask,
  CacheData,
  QueryOriginalContext,
  QueryOriginalFunction,
  defaultEncoder,
  defaultDecoder,
} from "./common";

export interface CacheOptions {
  /** 缓存时间，单位：秒 */
  ttl: number;
  /** Redis连接信息 */
  redis?: RedisStoreOptions;
  /** 内存存储引擎参数 */
  memory?: InMemoryStoreOptions;
  /** Memcached连接信息 */
  memcached?: MemcachedStoreOptions;
  /** 数据编码器 */
  encoder?: DataEncoder;
  /** 数据解码器 */
  decoder?: DataDecoder;
  /** 解码时使用Buffer数据类型，默认false */
  decodeBuffer?: boolean;
}

/**
 * 缓存管理器
 */
export class Cache {
  protected readonly store: CacheStore;
  protected readonly pendingTask: Map<string, AsyncTask[]> = new Map();
  protected readonly encode: DataEncoder;
  protected readonly decode: DataDecoder;
  protected readonly decodeBuffer: boolean;

  constructor(public readonly options: CacheOptions) {
    if (options.redis) {
      this.store = new RedisStore(options.redis);
    } else if (options.memcached) {
      this.store = new MemcachedStore(options.memcached);
    } else {
      this.store = new InMemoryStore({ interval: 500, ...options.memory });
    }
    this.encode = options.encoder || defaultEncoder;
    this.decode = options.decoder || defaultDecoder;
    this.decodeBuffer = options.decodeBuffer || false;
  }

  /**
   * 查询缓存数据，如果不存在则先调用指定方法查询，并缓存起来
   */
  public async get(
    key: string,
    queryOriginal?: QueryOriginalFunction,
    ttl: number = this.options.ttl,
  ): Promise<CacheData> {
    const current = await (this.decodeBuffer ? this.store.getBuffer(key) : this.store.get(key));
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
    await this.store.setex(key, ttl, this.encode(data));
  }

  /**
   * 删除缓存
   */
  public async delete(key: string): Promise<void> {
    await this.store.delete(key);
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
    this.store.close();
    this.pendingTask.clear();
  }
}
