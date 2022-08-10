const { autoGenerateRoute } = require("./utils.js");
const path = require("path");
const fs = require("fs");
const chokidar = require("chokidar");
class AutoRoutePlugin {
  constructor(options) {
    this.options = options;
    this.watcher = null;
  }
  apply(compiler) {
    compiler.hooks.afterPlugins.tap("afterPlugins", (params) => {
      console.log("afterPlugins:");
      console.log("自动生成路由................................afterPlugins");
      autoGenerateRoute(this.options);
    });
    compiler.hooks.emit.tapAsync("emit", (compilation, done) => {
      console.log("emit:", "asd");
      // 非生产环境，监测文件变化
      if (process.env.NODE_ENV !== "production") {
        if (!this.watcher) {
          this.watcher = chokidar
            .watch(
              path.join(
                process.cwd(),
                this.options.vueDirsAbsolute || "src/views"
              ),
              {
                persistent: true,
              }
            )
            .on("all", (event, path) => {
              if (event === "add" || event === "change")
                autoGenerateRoute(this.options);
            });
        }
      }

      done();
    });
    compiler.hooks.watchClose.tap("watchClose", (params) => {
      console.log("watchClose:", "asd");
      // 非生产环境，监测文件变化
      if (process.env.NODE_ENV !== "production") {
        if (this.watcher) {
          this.watcher.close();
          this.watcher = null;
        }
      }
    });
  }
}
module.exports = AutoRoutePlugin;
