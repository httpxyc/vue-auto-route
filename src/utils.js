const fg = require("fast-glob");
const fs = require("fs");
const path = require("path");
const vueSfcCompiler = require("@vue/compiler-sfc");

let ROUTE_DIR_ABSOLUTE = "src/test-route";
let ROUTE_DIR = "test-route";
let ROUTE_FILE_DIR = "src/route";
let ROUTE_FILE_NAME = "routes";
let ROUTE_TAG = "xyc-route";
let ROUTE_TS_TAG = false;
let route_str_list = [];
let route_path_list = [];

function autoGenerateRoute(
  options = {
    vueDirsAbsolute: "src/views", // 需要解析的vue视图文件目录绝对路径
    vueDirsName: "views", // 需要解析的vue视图文件目录名
    routeDir: "src/router", // 生成路由文件的目录
    routeName: "index.js", // 生成路由文件名
    routeTag: "xyc-route", // 路由标签
    isTs: false,
  }
) {
  // 解析options
  ROUTE_DIR_ABSOLUTE = options.vueDirsAbsolute;
  ROUTE_DIR = options.vueDirsName;
  ROUTE_FILE_DIR = options.routeDir;
  ROUTE_FILE_NAME = options.routeName;
  ROUTE_TAG = options.routeTag;
  ROUTE_TS_TAG = options.isTs;
  // 清空路由meta文件
  // delDir(ROUTE_FILE_DIR + '/meta')】

  // 读取需要自动生成路由的文件路径下所有vue文件
  const vuePagesList = fg.sync("**/*.vue", {
    onlyFiles: true,
    cwd: ROUTE_DIR_ABSOLUTE,
  });
  // 清空路由项数组
  route_str_list = [];
  // 根据目录下的文件列表，筛选具有路由配置的vue文件，并在解析各vue文件过程中初始化路由项数组
  route_path_list = filterConfigFiles(vuePagesList);
  layoutRoutesHandler(route_str_list);
  // 根据最终route_str_list生成route文件，此时子路由已被标记：hasHandle为true，过滤掉，生成最终routejs文件
  const resultList = route_str_list.filter((item) => {
    return !item.hasHandle;
  });
  return outputRouteFile(resultList);
}
function outputRouteFile(routes) {
  let metaStr = [];
  function outeput(list) {
    let routeStr = [];
    list.forEach((item) => {
      let str = `{
  path: "/${item.path}",
  name: "${item.name}",
  meta: ${item.meta},
  component: ${item.components}`;
      if (item.isLayout) {
        str += `,
  children: ${outeput(item.children)}`;
      }
      str += `
}`;
      routeStr.push(str);
      metaStr.push(`${item.metaImport}`);
    });
    return `[${routeStr.join(",")}]`;
  }
  const routeStr_final = outeput(routes);
  const finalStr = `${metaStr.join("\n")}\nexport default${routeStr_final}`;
  fs.writeFileSync(
    path.join(ROUTE_FILE_DIR, ROUTE_FILE_NAME),
    finalStr,
    "utf8"
  );
  return finalStr || "";
}
function filterConfigFiles(fileList) {
  const resultList = fileList.filter((filePath) => {
    const p = path.join(ROUTE_DIR_ABSOLUTE, filePath);
    const text = fs.readFileSync(p, "utf8");
    const vueObj = vueSfcCompiler.parse(text);
    // 判断是否有路由选项
    let tag = false;
    vueObj.descriptor.customBlocks.forEach((block) => {
      if (block.type === ROUTE_TAG) {
        // 如果有路由选项，将路由选项输出至meta文件夹中
        tag = true;
        outeputMetaFile(filePath, block);
        generateRouteStrByPath(filePath, block);
      }
    });
    return tag;
  });
  return resultList;
}
// 根据传入的目录字符串，自动递归创建目录
function autoMkdir(fileDir) {
  const a = fileDir.split(path.sep);
  function m(arr, length) {
    const dir = arr.slice(0, length).join(path.sep);
    fs.existsSync(dir) ? null : fs.mkdirSync(dir);
  }
  for (let i = 1; i <= a.length; i++) {
    m(a, i);
  }
}
function outeputMetaFile(filePath, block) {
  autoMkdir(path.join(ROUTE_FILE_DIR, "./meta"));
  const wp = path.join(
    ROUTE_FILE_DIR,
    "./meta",
    `${getMetaFileName(filePath)}${ROUTE_TS_TAG ? ".ts" : ".js"}`
  );
  fs.writeFileSync(wp, block.content, "utf8");
}
// 根据文件路径，生成元数据文件名
function getMetaFileName(filePath) {
  return filePath
    .split("/")
    .filter((item) => item !== "index.vue")
    .map((item) => {
      let res = `${item[0].toUpperCase()}${item.slice(1)}`;
      res = res.replace(/\.vue/, "");
      return res;
    })
    .join("");
}
// 根据文件路径及vue-compiler-sfc解析出来的block，生成route单项部分字段，不进行嵌套路由处理
function generateRouteStrByPath(filePath, block) {
  // 单项route path字段
  const routePath = filePath
    .split("/")
    .filter((item) => item !== "index.vue")
    .map((item) => {
      // 去除末尾的.vue
      let res = item.replace(/\.vue/, "");
      // 动态路由，将_开头的文件名替换成：路径
      res = res.replace(/_/, ":");
      return res;
    })
    .join("/");
  // 单项route name字段
  const routeName = filePath
    .split("/")
    .filter((item) => item !== "index.vue")
    .map((item) => {
      // 去除末尾的.vue
      let res = item.replace(/\.vue/, "");
      // 动态路由，将_开头的文件名替换成：路径
      res = res.replace(/_/, "");
      return res;
    })
    .join("-");

  // 单项route meta字段
  const metaFile = getMetaFileName(filePath);
  // 判断是否具有$layout字段，有则为嵌套路由，进行一个标记，后续分析父子关系构建完整的route项
  let isLayout = false;
  if (block.content.indexOf("$layout") !== -1) {
    isLayout = true;
  }

  const basicObj = {
    path: routePath,
    name: routeName,
    meta: "meta" + metaFile || {},
    components: `()=>import(/* webpackChunkName: "chunk_${metaFile}" */ '@/${ROUTE_DIR}/${filePath}')`,
    metaImport: `import meta${metaFile} from './meta/${metaFile}${
      ROUTE_TS_TAG ? "" : ".js"
    }'`,
    isLayout,
    filePath,
  };
  route_str_list.push(basicObj);
}

// 遍历route_str_list，对isLayout为true及嵌套路由父路由进行处理
function layoutRoutesHandler() {
  for (let route of route_str_list) {
    layoutRouteHandler(route);
  }
}
// 子路由也可能为嵌套路由，递归处理
function layoutRouteHandler(route) {
  if (route.isLayout) {
    const layoutFileDirPath = route.path;
    const childrenRoutes = route_str_list.filter((item) => {
      let tag = false;
      if (
        item.path.startsWith(layoutFileDirPath) &&
        item.path.split("/").length === layoutFileDirPath.split("/").length + 1
      ) {
        // path以父路由开头，并且只为子级不为孙子级
        tag = true;
        // 标记该项为父级的子级处理项，后续生成最终routes时，不为其生成路由（已作为父级路由的children注入了）
        item.hasHandle = true;
        if (item.isLayout) {
          // 若子级也为layout类型，递归处理
          layoutRouteHandler(item);
        }
      }

      return tag;
    });
    route.children = childrenRoutes;
  }
}
// 递归删除路由文件夹中的文件
function delDir(path) {
  let files = [];
  if (fs.existsSync(path)) {
    files = fs.readdirSync(path);
    files.forEach((file, index) => {
      let curPath = path + "/" + file;
      if (fs.statSync(curPath).isDirectory()) {
        delDir(curPath); //递归删除文件夹
      } else {
        fs.unlinkSync(curPath); //删除文件
      }
    });
    fs.rmdirSync(path);
  }
}
module.exports = { autoGenerateRoute };
