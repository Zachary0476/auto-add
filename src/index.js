const puppeteer = require("puppeteer");
const readline = require("readline");
const path = require("path");
const { appendFileSync, readFileSync, unlinkSync } = require("fs");

const { BROWSER_CONFIG } = require("../config");
const { getTargetOrder } = require("../utils");
const { log } = require("console");

let cookies = null, // 统一cookie
  PIDS = null, //需要打包的uiid str
  current = null, // 当前打包进程中的uiid
  targetUrl = "", // 目标地址
  SSO_URL = "", // SSO地址
  CONFIRM_URL = "", // 用于获取是否添加成功的接口地址
  customs = null, // 用户提供，保护接口安全
  phone = "", // 账号
  app = "", // 目标app
  home = ""; // 目标家庭

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// 输入pid并完成添加;
const repeatInputPid = async (page, pidInput) => {
  return new Promise(async (resolve) => {
    while (0 in PIDS) {
      pidInput.focus();
      await pidInput.click({ clickCount: 2 });
      current = PIDS.splice(0, 1)[0].trim();
      console.log(`\x1B[32m |${current}| is adding... \x1B[0m`);
      await page.keyboard.type(current);
      await page.$$eval("button.el-button.el-button--primary", async (eles) => {
        eles[1].click();
      });
      await page.waitForResponse(async (response) => {
        if (response.url().includes(CONFIRM_URL)) {
          const { flag } = await response.json();
          if (!flag) {
            console.log(`\x1B[31m ~~~添加${current}失败~~~~\x1B[0m`);
            appendFileSync(
              path.join(__dirname, `../etc/log.txt`),
              `${current}/`
            );
          } else {
            console.log(`\x1B[32m |${current}| 添加成功... \x1B[0m`);
          }
        }
        return "ok3";
      });
      await page.waitForTimeout(500);
    }
    resolve("ok1");
  });
};

// 创建自动添加环境
const openPuppeteer = (cookie) => {
  return new Promise(async (resolve) => {
    try {
      const browser = await puppeteer.launch(BROWSER_CONFIG);
      const page = await browser.newPage();
      await page.setCookie({
        name: "SSO_USER_TOKEN",
        value: cookie,
        url: targetUrl,
      });
      await page.goto(targetUrl);
      if (page.url().includes(SSO_URL)) {
        console.log("\x1B[31m 无效的cookie，请重新设置cookie \x1B[0m");
        unlinkSync(path.join(__dirname, `../etc/cache.txt`));
        unlinkSync(path.join(__dirname, `../etc/log.txt`));
        process.exit();
      }
      // 保证页面打开
      await page.waitForTimeout(8 * 1000);
      const inputs = await page.$$("input.el-input__inner", (eles) => eles);
      for (let i = 0; i < inputs.length - 1; i++) {
        inputs[i].focus();
        switch (i) {
          case 1:
            await page.waitForTimeout(500);
            await page.keyboard.type(phone);
            break;
          case 3:
            await page.waitForTimeout(500);
            await page.keyboard.type(app);
            await page.waitForTimeout(1000);
            await page.$$eval(".el-select-dropdown__item", async (eles) => {
              let targets = eles.filter((v) => v.innerText == "Wiser");
              targets[0].click();
            });
            break;
          case 4:
            await page.waitForTimeout(500);
            await page.keyboard.type(home);
            await page.waitForTimeout(1000);
            await page.$$eval(".el-select-dropdown__item", async (eles) => {
              let targets = eles.filter((v) => v.innerText == "Zachary");
              targets[0].click();
            });
            break;
          default:
            break;
        }
      }
      await repeatInputPid(page, inputs[2]);
      await browser.close();
      resolve("ok2");
    } catch (e) {
      console.log(`\x1B[31m ~~~无PID添加成功，流程序启动失败，~~~~\x1B[0m`);
      appendFileSync(
        path.join(__dirname, `../etc/log.txt`),
        `${PIDS.join("/")}/`
      );
      resolve("error");
    }
  });
};

// 封装readline
const askQuestions = (q) =>
  new Promise((resolve) => rl.question(q, (info) => resolve(info)));

// 用户交互及配置资源;
exports.terminalInteraction = async () => {
  customs = readFileSync(path.join(__dirname, `../etc/custom.txt`), {
    encoding: "utf8",
    flag: "as+",
  });
  cookies = readFileSync(path.join(__dirname, `../etc/cache.txt`), {
    encoding: "utf8",
    flag: "as+",
  });
  if (!customs) {
    const handlePath = await askQuestions("请拖拽custom配置文件到此:");
    customs = readFileSync(
      path.relative(`${process.cwd()}`, handlePath.replace(/'|"/g, "")),
      {
        encoding: "utf8",
        flag: "as+",
      }
    );
    appendFileSync(path.join(__dirname, `../etc/custom.txt`), customs);
  }
  customs = customs.split("\n");
  targetUrl = customs[0];
  SSO_URL = customs[1];
  CONFIRM_URL = customs[2];
  phone = customs[3];
  app = customs[4];
  home = customs[5];
  while (!cookies) {
    cookies = await askQuestions("请提供cookie:");
    appendFileSync(path.join(__dirname, `../etc/cache.txt`), cookies);
  }
  while (!PIDS) PIDS = await askQuestions("请提供需要添加的PID:");
  rl.close();
  PIDS = PIDS.split("/").filter((pid) => !!pid.trim());
  console.log(`\x1B[32m auto adding... \x1B[0m`);
  await openPuppeteer(cookies);

  // 读取日志并输出打印结果
  let logs = readFileSync(path.join(__dirname, `../etc/log.txt`), {
    encoding: "utf8",
    flag: "as+",
  });
  if (!!logs) {
    logs = console.log(`\x1B[31m 以下PID未添加成功，请重试: ${logs}\x1B[0m`);
  } else {
    console.log("\x1B[32m 全部添加成功 \x1B[0m");
  }
  unlinkSync(path.join(__dirname, `../etc/log.txt`));
  process.exit();
};
