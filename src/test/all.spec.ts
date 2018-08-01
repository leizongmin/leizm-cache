/**
 * @leizm/cache tests
 *
 * @author Zongmin Lei <leizongmin@gmail.com>
 */

import { Cache } from "../lib";
import { expect } from "chai";

function getRandomKey() {
  return `random:${Date.now()}:${Math.random()}`;
}

function getRandomData() {
  return { time: Date.now(), value: Math.random() };
}

function sleep(ms = 0) {
  return new Promise((resolve, reject) => {
    setTimeout(resolve, ms);
  });
}

function generateTests(title: string, options: any) {
  describe("测试 @leizm/cache " + title, function() {
    it("基本测试：get/set/delete", async function() {
      const ttl = 3;
      const cache = new Cache({ ...options, ttl });
      {
        const key = getRandomKey();
        const ret = await cache.get(key);
        expect(ret).to.equal(undefined);
      }
      {
        const key = getRandomKey();
        const data = getRandomData();
        await cache.set(key, data);
        const ret = await cache.get(key);
        expect(ret).to.deep.equal(data);
        const ret2 = await cache.get(key);
        expect(ret2).to.deep.equal(data);
        await cache.delete(key);
        const ret3 = await cache.get(key);
        expect(ret3).to.deep.equal(undefined);
      }
      {
        const key = getRandomKey();
        const data = getRandomData();
        const ret = await cache.get(key, async ctx => {
          expect(ctx.key).to.equal(key);
          expect(ctx.ttl).to.equal(ttl);
          return data;
        });
        expect(ret).to.deep.equal(data);
      }
      cache.destroy();
    });

    it("并发情况，只会从数据源查询一次", async function() {
      const ttl = 3;
      const cache = new Cache({ ...options, ttl });
      const key = getRandomKey();
      const data = getRandomData();
      const list = [];
      const size = 100;
      let counter = 0;
      for (let i = 0; i < size; i++) {
        list.push(
          cache.get(key, async ctx => {
            counter++;
            expect(ctx.key).to.equal(key);
            expect(ctx.ttl).to.equal(ttl);
            return data;
          }),
        );
      }
      const retList = await Promise.all(list);
      expect(retList.length).to.equal(size);
      for (const ret of retList) {
        expect(ret).to.deep.equal(data);
      }
      expect(counter).to.equal(1);
      cache.destroy();
    });

    it("define() 定义自动从数据源或缓存中查询数据的方法", async function() {
      const ttl = 3;
      const cache = new Cache({ ...options, ttl });
      const key = getRandomKey();
      const data = getRandomData();
      const getData = cache.define(key, async ctx => {
        expect(ctx.key).to.equal(key);
        expect(ctx.ttl).to.equal(ttl);
        return data;
      });
      for (let i = 0; i < 10; i++) {
        const ret = await getData();
        expect(ret).to.deep.equal(data);
      }
      cache.destroy();
    });

    it("查询数据函数发生异常", async function() {
      this.timeout(10000);
      const ttl = 3;
      const cache = new Cache({ ...options, ttl });
      {
        const key = getRandomKey();
        try {
          await cache.get(key, async ctx => {
            await sleep(Math.random() * 1000);
            throw new Error("test1");
          });
          throw new Error("不应该执行到此处");
        } catch (err) {
          expect(err.message).to.equal("test1");
        }
      }
      {
        const key = getRandomKey();
        const getData = cache.define(key, async ctx => {
          await sleep(Math.random() * 1000);
          throw new Error("test2");
        });
        try {
          await getData();
          throw new Error("不应该执行到此处");
        } catch (err) {
          expect(err.message).to.equal("test2");
        }
      }
      {
        const key = getRandomKey();
        let counter = 0;
        const getData = cache.define(key, async ctx => {
          counter++;
          await sleep(Math.random() * 100);
          throw new Error("test3");
        });
        const list = [];
        const size = 10;
        for (let i = 0; i < size; i++) {
          list.push(getData());
        }
        try {
          await Promise.all(list);
          throw new Error("不应该执行到此处");
        } catch (err) {
          expect(err.message).to.equal("test3");
        }
        await sleep(Math.random() * 1000);
        expect(counter).to.equal(1);
      }
      cache.destroy();
    });

    it("自定义 encoder & decoder", async function() {
      const ttl = 2;
      const encoder = (data: any) => "1" + data;
      const decoder = (data: string) => data + "2";
      const cache = new Cache({ ...options, ttl, encoder, decoder });
      const key = getRandomKey();
      let counter = 0;
      const getData = cache.define(key, async ctx => {
        expect(ctx.key).to.equal(key);
        expect(ctx.ttl).to.equal(ttl);
        counter++;
        return "hello";
      });
      expect(await getData()).to.equal("1hello2");
      expect(await getData()).to.equal("1hello2");
      expect(await getData()).to.equal("1hello2");
      expect(counter).to.equal(1);
      cache.destroy();
    });

    it("默认 ttl 与自定义 ttl", async function() {
      this.timeout(20000);
      const ttl = 2;
      const cache = new Cache({ ...options, ttl });
      {
        const key = getRandomKey();
        let counter = 0;
        const getData = cache.define(key, async ctx => {
          expect(ctx.key).to.equal(key);
          expect(ctx.ttl).to.equal(ttl);
          counter++;
          return counter;
        });
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(500);
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(2000);
        expect(await getData()).to.equal(2);
        expect(await getData()).to.equal(2);
      }
      {
        const key = getRandomKey();
        let counter = 0;
        const getData = cache.define(
          key,
          async ctx => {
            expect(ctx.key).to.equal(key);
            expect(ctx.ttl).to.equal(5);
            counter++;
            return counter;
          },
          5,
        );
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(500);
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(2000);
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(5000);
        expect(await getData()).to.equal(2);
        expect(await getData()).to.equal(2);
      }
      {
        const key = getRandomKey();
        let counter = 0;
        const getData = cache.define(
          key,
          async ctx => {
            expect(ctx.key).to.equal(key);
            expect(ctx.ttl).to.equal(3);
            ctx.ttl = 5;
            counter++;
            return counter;
          },
          3,
        );
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(500);
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(3000);
        expect(await getData()).to.equal(1);
        expect(await getData()).to.equal(1);
        await sleep(3000);
        expect(await getData()).to.equal(2);
        expect(await getData()).to.equal(2);
      }
      cache.destroy();
    });
  });
}

generateTests("使用Redis存储", { redis: { keyPrefix: "test:" } });
generateTests("内存", {});
