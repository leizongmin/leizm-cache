/**
 * @leizm/cache
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

/** 缓存数据 */
export type CacheData = any;

/** 数据编码器接口 */
export type DataEncoder = (data: any) => string | Buffer;

/** 数据解码器 */
export type DataDecoder = (data: string | Buffer) => any;

/** 默认数据编码器 */
export function defaultEncoder(data: any): string {
  return JSON.stringify(data);
}

/** 默认数据解码器 */
export function defaultDecoder(data: string | Buffer): any {
  return JSON.parse(data.toString());
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

export interface CacheStore {
  get(key: string): Promise<string | null>;
  getBuffer(key: string): Promise<Buffer | null>;
  setex(key: string, ttl: number, data: string | Buffer): Promise<void>;
  del(key: string): Promise<void>;
  disconnect(): void;
}
