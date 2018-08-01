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

基于 Redis 的缓存管理器

## 安装

```bash
npm i @leizm/cache -S
```

## 基本使用方法

```typescript
import { Cache } from "@leizm/cache";

// 创建实例
const cache = new Cache({
  // Redis 连接配置，参考 ioredis 模块
  redis: {
    host: "127.0.0.1",
    port: 6379,
    db: 1,
    password: "",
    keyPredix: "CACHE:",
  },
  // 默认缓存时间，秒
  ttl: 3600,
});

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
  - `redis` Redis连接配置，参考 [ioredis](https://www.npmjs.com/package/ioredis) 模块，**如果不提供此参数，则会默认使用内存存储**
  - `memory` 内存存储引擎配置 **实验性**
  - `encoder` 数据编码器，格式：`(data: any) => string`，默认为 `JSON.stringify`（**由于JSON解析器在数据长度大的时候性能较差，为提高性能需要定义自己的数据编码方式**）
  - `decoder` 数据解码器，格式：`(data: string) => any`，默认为 `JSON.parse`
- `cache.get(key, queryOriginal?, ttl?)` 查询缓存，如果缓存不存在则先使用 `queryOriginal` 查询数据（如果没指定该参数则返回 `undefined`），如果没指定 `ttl` 则使用全局的 `ttl`
- `cache.define(key, queryOriginal, ttl?)` 定义查询缓存的方法，返回一个函数，无需传递任何参数直接调用该函数即可返回缓存数据（参数说明同上）
- `cache.set(key, data, ttl?)` 手动设置缓存数据，如果没指定 `ttl` 则使用全局的 `ttl`
- `cache.delete(key)` 手动删除缓存数据
- `cache.destroy()` 销毁缓存管理器

其中 `queryOriginal` 的格式为：`function queryOriginal(ctx) { }`，`ctx`  包含以下属性：

- `key` 当前要缓存的键
- `ttl` 当前缓存时间（秒），通过修改此值可以动态改变 `ttl`

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
