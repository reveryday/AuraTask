# AuraTask

[English](./README.md) · **简体中文**

[![最新版本](https://img.shields.io/github/v/release/reveryday/AuraTask?label=%E4%B8%8B%E8%BD%BD&color=4f46e5&style=flat-square)](https://github.com/reveryday/AuraTask/releases/latest)
[![下载次数](https://img.shields.io/github/downloads/reveryday/AuraTask/total?label=%E5%85%B1%E4%B8%8B%E8%BD%BD&style=flat-square)](https://github.com/reveryday/AuraTask/releases)
[![平台](https://img.shields.io/badge/%E5%B9%B3%E5%8F%B0-Windows%2010%2F11-blue?style=flat-square)](#%E5%AE%89%E8%A3%85)

AuraTask 把研究生日常会用到的几件事——任务规划、专注计时、习惯养成、思路整理、状态记录——揉成一个轻量原生应用。数据全部存在本地 SQLite，没有账号、没有云、不联网，关掉就忘了它存在。

## 特性

- **日 / 周 / 月**三种粒度自由切换，任务可标记**主要 / 延伸**两种类型，周视图按**上午 / 下午 / 晚上**色块分区；
- **稍后收件箱**：无日期任务暂存区，等空了再排期；

- 番茄钟，**专注 / 休息时长可自定义**（含 25/5、50/10、90/20 预设），可绑定一个任务做"我正在专注于……"，结束自动入库并弹 Windows 系统通知；

- 支持**二元习惯**（做没做）和**量化习惯**（如每天学习 7 小时，达标才计完成），每张卡显示**连续天数**、**近 30 天完成率**、**迷你热力图**；
- 思维导图**左→右自动布局**的树状导图，多张导图可命名管理，节点可**关联任务**，自动显示完成状态；

- 每日一选 emoji 记录心情（😄🙂😐😕😭），周月视图小角标可见；
- **学习统计**页：周/月范围内的专注分钟、任务完成率、活跃天数、心情走势、习惯坚持、标签时间分布；

- **JSON 一键备份/恢复**（导出可放 OneDrive/Dropbox，重装系统不丢）
- 本地 SQLite，迁移机制管理 schema

## 快捷键

| 键位 | 功能 |
| --- | --- |
| `Ctrl + N` | 新建任务（任意视图） |
| `Ctrl + 1` | 日历视图 |
| `Ctrl + 2` | 稍后收件箱 |
| `Ctrl + 3` | 习惯 |
| `Ctrl + 4` | 思维导图 |
| `Ctrl + 5` | 专注计时 |
| `Ctrl + 6` | 学习统计 |
| `Esc` | 关闭对话框 |

思维导图内部：

| 键位 | 功能 |
| --- | --- |
| `Tab` | 创建子主题 |
| `Enter` | 同级主题（根节点上等同于 Tab） |
| `F2` / 双击 | 进入编辑 |
| `Del` / `Backspace` | 删除节点（含子树） |
| 编辑中 `Tab` | 保存当前 + 立刻新建子节点 |
| 编辑中 `Esc` | 放弃改动 |

## 技术栈

- **Tauri 2** —— Rust 内核，Windows 原生应用，自定义无边框窗口
- **React 19 + TypeScript + Vite**
- **SQLite** via [`tauri-plugin-sql`](https://github.com/tauri-apps/plugins-workspace)
- 桌面集成插件：`tauri-plugin-window-state`、`tauri-plugin-notification`、`tauri-plugin-dialog`、`tauri-plugin-fs`
- 纯手写 CSS（无组件库），macOS 风格的层次与发丝边界

数据存储位置：`%APPDATA%\com.auratask.app\auratask.db`

## 安装

**👉 [下载最新安装包](https://github.com/reveryday/AuraTask/releases/latest)**（Windows 10 / 11 的 `.msi` 或 `.exe`）。

安装包未签名，首次运行 SmartScreen 可能提示风险——点 *更多信息 → 仍要运行*。装完后数据在 `%APPDATA%\com.auratask.app\auratask.db`，可以随时从侧边栏导出备份。

## 开发

### 前置要求

- **Node.js** 20+
- **Rust** stable (`rustup` 安装)
- **Visual Studio Build Tools 2022** —— 必须勾选 *使用 C++ 的桌面开发* 工作负载（提供 `link.exe`）
- **Windows 10 SDK** 或 Windows 11 SDK（前者兼容性更好）

验证 MSVC 是否就绪：`where.exe link` 应能输出路径。

### 启动开发

```powershell
npm install
npm run tauri dev   # Vite + 原生窗口，前端热更新
```

仅前端（不需要 MSVC，便于纯 UI 调试）：

```powershell
npm run dev
```

### 类型检查

```powershell
npx tsc --noEmit
```

### 构建发布包

```powershell
npm run tauri build
```

产物在 `src-tauri/target/release/bundle/`，包含独立 `AuraTask.exe` 和 `.msi` 安装器。

## 项目结构

```
src/
├── App.tsx                  # 顶层视图路由 + 状态总管 + 全局快捷键
├── main.tsx
├── types.ts                 # 数据模型 + 枚举
├── db/
│   └── database.ts          # 唯一与 SQLite 通信的模块
├── components/              # 视图与对话框
│   ├── DayView.tsx / WeekView.tsx / MonthView.tsx
│   ├── InboxView.tsx / FocusView.tsx
│   ├── HabitsView.tsx / MindmapsView.tsx / StatsView.tsx
│   ├── TaskDialog.tsx / HabitDialog.tsx
│   ├── TopbarChips.tsx / WindowControls.tsx
│   ├── ThemeToggle.tsx / BackupActions.tsx
│   └── ...
├── hooks/
│   └── useFocusTimer.ts     # 番茄钟状态提升到 App 层，跨视图持续
├── utils/                   # 纯函数：日期、树布局、备份、通知
└── styles/global.css        # 全局样式（CSS 变量驱动浅/深主题）

src-tauri/
├── src/lib.rs               # Rust 入口：插件注册 + SQL 迁移
├── tauri.conf.json          # 窗口配置（无边框）/ 应用元信息
├── capabilities/default.json  # 插件权限白名单
└── icons/                   # 应用图标全套
```

## 数据库迁移说明

Schema 通过 `tauri-plugin-sql` 的 `Migration` 数组管理（见 `src-tauri/src/lib.rs`）。**一旦某版本迁移已发布运行过，就绝不能修改它的 SQL 字符串**——插件会对 SQL 求哈希，改动后下次启动会报 `"migration N was previously applied but has been modified"`。新需求一律新增 `version: N+1` 的迁移。

## 备份

侧边栏底部 *💾 导出备份 / 📂 导入备份*：

- **导出** —— 弹出原生保存对话框，写一份完整 JSON（含全部 7 张表 + 版本号 + 时间戳）
- **导入** —— 选择 JSON 文件，**会清空当前数据并替换**（带二次确认）

定期把导出的 JSON 备份到 OneDrive / Dropbox / iCloud，重装系统不慌。

## 许可

版权所有 © reveryday，保留一切权利。仓库代码仅出于透明展示目的公开——**不授权**任何形式的复制、修改、再发布或源码层面的使用，使用本软件请通过 Releases 页面下载官方安装包。完整声明见 [LICENSE](./LICENSE)。
