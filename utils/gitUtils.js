const { exec } = require("child_process");

function gitCommitAndPush(message, callback) {
  exec(
    `cd /root/Hero-Dex && git add . && git commit -m "${message}" && git push`,
    (err, stdout, stderr) => {
      if (err) {
        console.error("Git push error:", err);
        console.error(stderr);
        if (callback) callback(false, stderr);
        return;
      }

      console.log("Git push success:");
      console.log(stdout);
      if (callback) callback(true, stdout);
    }
  );
}

module.exports = {
  gitCommitAndPush
};
