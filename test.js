const fs = require("fs");

const person = {
  name: "zacahry",
  sex: "man",
};

fs.writeFileSync("./log.txt", JSON.stringify(person));
