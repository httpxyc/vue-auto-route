const { autoGenerateRoute } = require("./utils.js")
const path = require("path")
const fs = require("fs")
const chokidar = require("chokidar")
class AutoRoutePlugin {
  constructor(options) {
    this.options = options
    this.watcher = null
  }
  apply(compiler) {
    compiler.hooks.afterPlugins.tap("afterPlugins", (params) => {
      console.log("\x1B[34m自动生成路由中...........\x1B[0m")
      autoGenerateRoute(this.options)
      console.log("\x1B[34m自动生成路由完毕\x1B[0m")
    })
    compiler.hooks.emit.tapAsync("emit", (compilation, done) => {
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
              console.log("\x1B[34m自动生成路由中...........\x1B[0m")
              autoGenerateRoute(this.options)
              console.log("\x1B[34m自动生成路由完毕\x1B[0m")
            })
        }
      }

      done()
    })
    compiler.hooks.watchClose.tap("watchClose", (params) => {
      // 非生产环境，监测文件变化
      if (process.env.NODE_ENV !== "production") {
        if (this.watcher) {
          this.watcher.close()
          this.watcher = null
        }
      }
    })
  }
}
module.exports = AutoRoutePlugin
