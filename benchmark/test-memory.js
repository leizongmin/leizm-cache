const Benchmarkify = require("benchmarkify");
const { Cache } = require("../dist/lib");

async function main() {
  const ttl = 30;
  const key = "benchmark" + Date.now() + Math.random();
  const str1 = "X".repeat(1024);
  const str2 = "X".repeat(1024 * 64);
  const str3 = "X".repeat(1024 * 512);
  const buf1 = Buffer.allocUnsafe(1024);
  const buf2 = Buffer.allocUnsafe(1024 * 64);
  const buf3 = Buffer.allocUnsafe(1024 * 512);
  const encoder = v => v;
  const decoder = v => v;
  const benchmark = new Benchmarkify("@leizm/cache 性能测试", { time: ttl * 1000, spinner: false }).printHeader();
  const bench = benchmark.createSuite("all");

  async function createTests(title, options) {
    const s1 = new Cache({ ttl, ...options, encoder, decoder });
    const s2 = new Cache({ ttl, ...options, encoder, decoder, decodeBuffer: true });
    {
      const get = s1.define(key + "str1", async () => str1);
      await get();
      bench.add(title + " - get(str1): 1K", done => {
        get()
          .then(() => done())
          .catch(done);
      });
    }
    {
      const get = s2.define(key + "buf1", async () => buf1);
      await get();
      bench.add(title + " - get(buf1): 1K", done => {
        get()
          .then(() => done())
          .catch(done);
      });
    }
    {
      const get = s1.define(key + "str2", async () => str2);
      await get();
      bench.add(title + " - get(str2): 64K", done => {
        get()
          .then(() => done())
          .catch(done);
      });
    }
    {
      const get = s2.define(key + "buf2", async () => buf2);
      await get();
      bench.add(title + " - get(buf2): 64K", done => {
        get()
          .then(() => done())
          .catch(done);
      });
    }
    {
      const get = s1.define(key + "str3", async () => str3);
      await get();
      bench.add(title + " - get(str3): 512K", done => {
        get()
          .then(() => done())
          .catch(done);
      });
    }
    {
      const get = s2.define(key + "buf3", async () => buf3);
      await get();
      bench.add(title + " - get(buf3): 512K", done => {
        get()
          .then(() => done())
          .catch(done);
      });
    }
    return [s1, s2];
  }

  let slist = [];
  slist = slist.concat(await createTests("Memcached", { memcached: { server: "127.0.0.1:11211" } }));
  slist = slist.concat(await createTests("Redis", { redis: { db: 15 } }));
  // slist = slist.concat(await createTests("InMemoryStore", {}));

  await benchmark.run();

  slist.forEach(s => s.destroy());
}

main().catch(err => console.error(err));
