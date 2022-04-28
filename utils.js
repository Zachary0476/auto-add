// 数组整理 排序 拿到最新的分支名称
const getTargetOrder = (origin) => {
  const target = origin.reduce((target, item) => {
    target.push({
      name: item["name"],
      time: +new Date(item["commit"]["committed_date"]),
    });
    return target;
  }, []);

  target.sort((a, b) => b.time - a.time);

  return target[0]["name"];
};


module.exports = {
  getTargetOrder,
};
