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

describe("测试 @leizm/cache", function() {
  it("基本测试：get/set/delete", async function() {
    const cache = new Cache({ redis: { keyPrefix: "test:" }, ttl: 3 });
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
      const ret = await cache.get(key, async k => {
        expect(k).to.equal(key);
        return data;
      });
      expect(ret).to.deep.equal(data);
    }
    cache.destroy();
  });

  it("并发情况，只会从数据源查询一次", async function() {
    const cache = new Cache({ redis: { keyPrefix: "test:" }, ttl: 3 });
    const key = getRandomKey();
    const data = getRandomData();
    const list = [];
    const size = 100;
    let counter = 0;
    for (let i = 0; i < size; i++) {
      list.push(
        cache.get(key, async k => {
          counter++;
          expect(k).to.equal(key);
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
    const cache = new Cache({ redis: { keyPrefix: "test:" }, ttl: 3 });
    const key = getRandomKey();
    const data = getRandomData();
    const getData = cache.define(key, async k => {
      expect(k).to.equal(key);
      return data;
    });
    for (let i = 0; i < 10; i++) {
      const ret = await getData();
      expect(ret).to.deep.equal(data);
    }
    cache.destroy();
  });

  it("默认 ttl 与自定义 ttl", async function() {
    this.timeout(20000);
    const cache = new Cache({ redis: { keyPrefix: "test:" }, ttl: 2 });
    {
      const key = getRandomKey();
      let counter = 0;
      const getData = cache.define(key, async k => {
        expect(k).to.equal(key);
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
      expect(await getData()).to.equal(2);
    }
    {
      const key = getRandomKey();
      let counter = 0;
      const getData = cache.define(
        key,
        async k => {
          expect(k).to.equal(key);
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
      expect(await getData()).to.equal(1);
      await sleep(5000);
      expect(await getData()).to.equal(2);
      expect(await getData()).to.equal(2);
      expect(await getData()).to.equal(2);
    }
    cache.destroy();
  });
});
