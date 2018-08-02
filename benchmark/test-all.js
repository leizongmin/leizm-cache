const { Cache } = require("../dist/lib");

class Benchmark {
  constructor(title, time = 2000, concurrent = 100) {
    this.title = title;
    this.time = time;
    this.concurrent = concurrent;
    this.list = [];
  }
  add(subTitle, fn) {
    this.list.push({ subTitle, fn });
  }
  sleep(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
  async runTask(index) {
    const timeStart = process.uptime();
    const task = this.list[index];
    let isEnd = false;
    let pList = [];
    let count = 0;
    for (let i = 0; i < this.concurrent; i++) {
      pList.push(
        (async function() {
          while (!isEnd) {
            await task.fn();
            count++;
          }
        })(),
      );
    }
    await this.sleep(this.time);
    isEnd = true;
    await Promise.all(pList);
    const spent = process.uptime() - timeStart;
    return { ...task, spent, count };
  }
  async run() {
    function leftPad(str, size) {
      str = str.toString();
      if (str.length < size) {
        return " ".repeat(size - str.length) + str;
      } else {
        return str.slice(0, size);
      }
    }
    const tList = [];
    for (let i = 0; i < this.list.length; i++) {
      console.log("[%s/%s] run test: %s", i, this.list.length, this.list[i].subTitle);
      const task = await this.runTask(i);
      tList.push(task);
      await this.sleep(1000);
    }
    tList.sort((a, b) => b.count - a.count);
    const rList = tList.map(task => {
      const a = leftPad(task.spent.toFixed(3), 10);
      const b = leftPad(task.count, 10);
      const c = leftPad((task.count / task.spent).toFixed(1), 10);
      const d = task.subTitle.slice(0, process.stdout.columns - 40);
      const msg = `${a} | ${b} | ${c} | ${d}`;
      return msg;
    });
    console.log("");
    console.log("-".repeat(process.stdout.columns || 80));
    console.log(
      `${leftPad("time (s)", 10)} | ${leftPad("requests", 10)} | ${leftPad("rps", 10)} | test`.slice(
        0,
        process.stdout.columns || 80,
      ),
    );
    console.log(
      `${"-".repeat(11)}+${"-".repeat(12)}+${"-".repeat(12)}+${"-".repeat(80)}`.slice(0, process.stdout.columns || 80),
    );
    console.log(rList.join("\n"));
    console.log("-".repeat(process.stdout.columns || 80));
  }
}

async function main() {
  const ttl = 20;
  const key = "benchmark" + Date.now() + Math.random();
  const str1 = "X".repeat(1024);
  const str2 = "X".repeat(1024 * 64);
  const str3 = "X".repeat(1024 * 512);
  const buf1 = Buffer.allocUnsafe(1024);
  const buf2 = Buffer.allocUnsafe(1024 * 64);
  const buf3 = Buffer.allocUnsafe(1024 * 512);
  const encoder = v => v;
  const decoder = v => v;
  const benchmark = new Benchmark("@leizm/cache 性能测试", ttl * 1000);

  async function createTests(title, options) {
    const s1 = new Cache({ ttl, ...options, encoder, decoder });
    const s2 = new Cache({ ttl, ...options, encoder, decoder, decodeBuffer: true });
    {
      const get = s1.define(key + "str1", async () => str1);
      await get();
      benchmark.add("get(str1): 1K - " + title, () => get());
    }
    {
      const get = s2.define(key + "buf1", async () => buf1);
      await get();
      benchmark.add("get(buf1): 1K - " + title, () => get());
    }
    {
      const get = s1.define(key + "str2", async () => str2);
      await get();
      benchmark.add("get(str2): 64K - " + title, () => get());
    }
    {
      const get = s2.define(key + "buf2", async () => buf2);
      await get();
      benchmark.add("get(buf2): 64K - " + title, () => get());
    }
    {
      const get = s1.define(key + "str3", async () => str3);
      await get();
      benchmark.add("get(str3): 512K - " + title, () => get());
    }
    {
      const get = s2.define(key + "buf3", async () => buf3);
      await get();
      benchmark.add("get(buf3): 512K - " + title, () => get());
    }
    return [s1, s2];
  }

  let slist = [];
  // slist = slist.concat(await createTests("InMemoryStore", {}));
  slist = slist.concat(await createTests("Memcached", { memcached: { server: "127.0.0.1:11211" } }));
  slist = slist.concat(await createTests("Redis", { redis: { db: 15 } }));

  await benchmark.run();

  slist.forEach(s => s.destroy());
}

main().catch(err => console.error(err));
