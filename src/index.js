const puppeteer = require("puppeteer");
const readline = require("readline");
const path = require("path");
const { appendFileSync, readFileSync, unlinkSync } = require("fs");

const { BROWSER_CONFIG } = require("../config");
const { getTargetOrder } = require("../utils");

let timer = null,
  cookies = null,
  UIIDStringEntered = null, //需要打包的uiid str
  UIIDS = null, // uiid数组
  current = null, // 当前打包进程中的uiid
  targetUrl = "",
  SSO_URL = "",
  customs = null,
  phone = "",
  app = "",
  home = "";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const createBoundle = (cookie, current) => {
  return new Promise(async (resolve) => {
    try {
      const browser = await puppeteer.launch(BROWSER_CONFIG);
      const page = await browser.newPage();
      // 收集操作流程异常不抛错的问题～
      timer = setTimeout(() => {
        resolve("error");
      }, 60 * 1000);
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
      await page.waitForTimeout(5 * 1000);
      const inputs = await page.$$("input.el-input__inner", (eles) => eles);
      for (let i = 0; i < inputs.length - 1; i++) {
        inputs[i].focus();
        switch (i) {
          case 1:
            await page.waitForTimeout(500);
            await page.keyboard.type(phone);
            break;
          case 2:
            await page.waitForTimeout(500);
            await page.keyboard.type(current);
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
      await page.waitForTimeout(3 * 1000);
      await page.$$eval("button.el-button.el-button--primary", async (eles) => {
        eles[1].click();
      });
      await page.waitForTimeout(3 * 1000);

      clearTimeout(timer);
      await browser.close();
      resolve("ok");
    } catch (e) {
      resolve("error");
    }
  });
};

const askQuestions = (q) =>
  new Promise((resolve) => rl.question(q, (info) => resolve(info)));

exports.startPipeLine = async () => {
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

  phone = customs[2];
  app = customs[3];
  home = customs[4];

  while (!cookies) {
    cookies = await askQuestions("请提供cookie:");
    appendFileSync(path.join(__dirname, `../etc/cache.txt`), cookies);
  }
  while (!UIIDStringEntered)
    UIIDStringEntered = await askQuestions("请提供需要添加的PID:");
  rl.close();
  UIIDS = UIIDStringEntered.split("/");
  while (0 in UIIDS) {
    current = UIIDS.splice(0, 1)[0].trim();
    console.log(`\x1B[32m auto adding ${current} ... \x1B[0m`);
    const result = await createBoundle(cookies, current);
    if (result === "error") {
      console.log(`\x1B[31m ~~~添加${current}失败~~~~\x1B[0m`);
      appendFileSync(path.join(__dirname, `../etc/log.txt`), `${current}/`);
    }
  }
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
