[![NPM version][npm-image]][npm-url]
[![build status][travis-image]][travis-url]
[![Test coverage][coveralls-image]][coveralls-url]
[![David deps][david-image]][david-url]
[![node version][node-image]][node-url]
[![npm download][download-image]][download-url]
[![npm license][license-image]][download-url]

[npm-image]: https://img.shields.io/npm/v/@leizm/cache.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@leizm/cache
[travis-image]: https://img.shields.io/travis/leizongmin/leizm-cache.svg?style=flat-square
[travis-url]: https://travis-ci.org/leizongmin/leizm-cache
[coveralls-image]: https://img.shields.io/coveralls/leizongmin/leizm-cache.svg?style=flat-square
[coveralls-url]: https://coveralls.io/r/leizongmin/leizm-cache?branch=master
[david-image]: https://img.shields.io/david/leizongmin/leizm-cache.svg?style=flat-square
[david-url]: https://david-dm.org/leizongmin/leizm-cache
[node-image]: https://img.shields.io/badge/node.js-%3E=_6.0-green.svg?style=flat-square
[node-url]: http://nodejs.org/download/
[download-image]: https://img.shields.io/npm/dm/@leizm/cache.svg?style=flat-square
[download-url]: https://npmjs.org/package/@leizm/cache
[license-image]: https://img.shields.io/npm/l/@leizm/cache.svg

# @leizm/cache

[![Greenkeeper badge](https://badges.greenkeeper.io/leizongmin/leizm-cache.svg)](https://greenkeeper.io/)
[![DeepScan grade](https://deepscan.io/api/projects/2920/branches/22356/badge/grade.svg)](https://deepscan.io/dashboard#view=project&pid=2920&bid=22356)

高性能缓存管理器，支持 Redis、Memcached 和内存存储

## 安装

```bash
npm i @leizm/cache -S
```

## 基本使用方法

```typescript
import { Cache } from "@leizm/cache";

// 创建实例，默认使用内存存储
const cache = new Cache({
  // 默认缓存时间，秒
  ttl: 3600,
});

// // 使用 Redis 存储
// const cache = new Cache({
//   // 默认缓存时间，秒
//   ttl: 3600,
//   // Redis 连接配置，参考 ioredis 模块
//   redis: {
//     host: "127.0.0.1",
//     port: 6379,
//     db: 1,
//     password: "",
//     keyPredix: "CACHE:",
//   },
// });

// // 使用 Memcached 存储
// const cache = new Cache({
//   // 默认缓存时间，秒
//   ttl: 3600,
//   // Memcached 连接配置，参考 memjs 模块
//   memcached: {
//     server: "127.0.0.1:11211",
//   },
// });

// 查询缓存
const data = await cache.get("key_name", async function(ctx) {
  // 如果没有缓存数据，则会调用此方法查询数据
  return "any data";
});

// 定义查询缓存的方法
const getData = cache.define("key_name", async function(ctx) {
  // 如果没有缓存数据，则会调用此方法查询数据
  return "any data";
});
// 直接调用该方法获取数据
const data = await getData();
```

具体接口如下：

- `new Cache({ ttl, redis?, encoder?, decoder? })` 创建缓存管理器实例：
  - `ttl` 默认缓存时间，秒
  - `redis` Redis 连接配置，参考 [ioredis](https://www.npmjs.com/package/ioredis) 模块 **推荐使用 Redis 存储**
  - `memcached` Memcached 连接配置，参考 [memjs](https://www.npmjs.com/package/memjs) 模块
  - `memory` 内存存储引擎配置 **如果没有配置其他数据库连接，默认使用此配置**
  - `encoder` 数据编码器，格式：`(data: any) => string | Buffer`，默认为 `JSON.stringify(data)`（**由于 JSON 解析器在数据长度大的时候性能较差，为提高性能需要定义自己的数据编码方式**）
  - `decoder` 数据解码器，格式：`(data: string | Buffer) => any`，默认为 `JSON.parse(data.toString())`
  - `decodeBuffer` 传递给 `decoder` 的数据是否使用 Buffer 类型（默认为 string），**当使用自定义 decoder 时，为提高性能可考虑将此参数设置为 true（比如直接存储 gzip 数据流）**
- `cache.get(key, queryOriginal?, ttl?)` 查询缓存，如果缓存不存在则先使用 `queryOriginal` 查询数据（如果没指定该参数则返回 `undefined`），如果没指定 `ttl` 则使用全局的 `ttl`
- `cache.define(key, queryOriginal, ttl?)` 定义查询缓存的方法，返回一个函数，无需传递任何参数直接调用该函数即可返回缓存数据（参数说明同上）
- `cache.set(key, data, ttl?)` 手动设置缓存数据，如果没指定 `ttl` 则使用全局的 `ttl`
- `cache.delete(key)` 手动删除缓存数据
- `cache.destroy()` 销毁缓存管理器

其中 `queryOriginal` 的格式为：`function queryOriginal(ctx) { }`，`ctx` 包含以下属性：

- `key` 当前要缓存的键
- `ttl` 当前缓存时间（秒），通过修改此值可以动态改变 `ttl`

## 性能测试

Redis 存储引擎比 Memcached 性能高（可能为 NPM 客户端模块实现有问题）：

```text
------------------------------------------------------------------------------------------------
Platform info:
- Darwin 17.7.0 x64
- Node.JS: 8.11.3
- V8: 6.2.414.54
- Intel(R) Core(TM) i7-6820HQ CPU @ 2.70GHz × 8
------------------------------------------------------------------------------------------------
  time (s) |   requests |        rps | test
-----------+------------+------------+----------------------------------------------------------
    20.006 |     868500 |    43412.0 | get(buf1): 1K - Redis
    20.006 |     851900 |    42582.2 | get(str1): 1K - Redis
    20.052 |     523883 |    26126.2 | get(buf1): 1K - Memcached
    20.083 |     500001 |    24896.7 | get(str1): 1K - Memcached
    20.009 |     160506 |     8021.7 | get(buf2): 64K - Redis
    20.029 |     142587 |     7119.0 | get(str2): 64K - Redis
    20.026 |     113209 |     5653.1 | get(buf2): 64K - Memcached
    20.020 |      99142 |     4952.1 | get(str2): 64K - Memcached
    20.059 |      25900 |     1291.2 | get(buf3): 512K - Redis
    20.137 |      15231 |      756.4 | get(str3): 512K - Redis
    20.022 |       6931 |      346.2 | get(buf3): 512K - Memcached
    20.345 |       6177 |      303.6 | get(str3): 512K - Memcached
------------------------------------------------------------------------------------------------
```

## License

```text
MIT License

Copyright (c) 2018 Zongmin Lei <leizongmin@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
