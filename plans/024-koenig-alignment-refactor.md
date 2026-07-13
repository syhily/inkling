# Plan 024: koenig 对齐重构（系统性对比 + 回流/修复）

> 基准 commit：`40dcf89`（批 2 完成点）
> 参考仓库（只读）：`/Users/YufanSheng/Developer/xiaoyu/Ghost/koenig`（Ghost koenig monorepo 子树，checkout 于 `97403cf`，2026-07-13）

## 背景与结论

inkling 是 koenig 的衍生单包重构版，两者各自完成 JS→TS 转换。8 个并行探查代理对全部领域做了 prettier 归一化后的逐文件 diff（范围 A–H：base 节点、html renderer、html-to-lexical、markdown/clean-basic-html、utils/transforms、nodes 包装层、plugins、components/hooks/配置）。

**总体判断：inkling 类型工程整体领先 koenig**（koenig-lexical 是 `strict: false` + 隐式 any；inkling 是 `strict: true`）。因此"对齐"的定义是：

1. **回流** koenig 更优的具体项（类型模式、bug 修复、缺失功能）；
2. **修复**对比暴露的 inkling 自身回归（本次最大价值）；
3. **不回退** inkling 的优势（见末尾清单）；
4. 产品裁剪项**不动**（见末尾清单）。

## 决策原则（所有批次通用）

- koenig 侧只读。改名噪音不算差异（Koenig→Inkling、kg-→inkling-、`@tryghost/*`→`@/*`、`.js` 后缀、格式风格）。
- inkling 风格：2 空格、无分号、单引号、oxfmt/oxlint 门禁。
- 每批恰好一个 conventional commit 落 `main`，不碰 `plans/`（索引由 reviewer 维护）。
- 门禁（每批必跑）：`pnpm typecheck`、`pnpm lint`（0 warnings）、`pnpm test:unit`（含构建，~3-5 分钟）、`pnpm format:check`。UI 批次加针对性 e2e（`pnpm exec playwright test <spec> --project=chromium`）。
- 遇到与计划描述不符的实际情况：先合理适配；需改变运行时行为或大面积改动时 STOP 并报告。
- 新增/修改行为必须补测试，不得削弱既有断言。

## 批次进度

| 批次 | 内容                               | Commit    | 状态 |
| ---- | ---------------------------------- | --------- | ---- |
| 1    | 共享工具回流                       | `cdbbf8c` | DONE |
| 2    | generateDecoratorNode 泛型类型回流 | `40dcf89` | DONE |
| 3    | 节点层修复                         | —         | TODO |
| 4    | 组件层回归修复                     | —         | TODO |
| 5    | 插件层修复                         | —         | TODO |
| 6    | 邮件渲染回流                       | —         | TODO |
| 7    | 死代码与存疑项清理                 | —         | TODO |

### 批 1（DONE `cdbbf8c`）

`src/nodes/base/utils/card-widths.ts`（CARD_WIDTHS/CardWidth/isCardWidth/normalizeCardWidth）+ CardContext/CardWrapper/image-card-widths 收敛；replacement-strings 防二次包裹；html-renderer emailUniqueid 分支恢复；`_oneline` 改进（折行→单空格、去 `>\s+<`/`\s+>`）。

### 批 2（DONE `40dcf89`）

`generate-decorator-node.ts`：`TRenderNode` 第四泛型 + bivarianceHack；`SerializedGeneratedDecoratorNode<TDataset>`（intersection 替代 Spread）；`exportJSON` 去掉 `@ts-expect-error`；exportDOM 版本解析显式 narrow；HeaderNode 接显式类型实参。保留了 inkling 的统一 `??` 默认值（koenig 的 `||` 对 falsy 有 bug）。

### 批 3：节点层修复（TODO）

1. `src/nodes/ButtonNode.tsx:95` `$$isisButtonNode`、`src/nodes/ToggleNode.tsx:128` `$$isisToggleNode` — 改名事故，改回 `$isButtonNode`/`$isToggleNode`（koenig 侧为正确名），同步修正 `test/unit/nodes/ButtonNode.test.ts:5` 及全部引用方，grep 确认无残留。
2. `src/nodes/VideoNodeComponent.tsx:219` — `(node as GeneratedDecoratorNodeBase).loop = true` 硬编码 → koenig 原版 `node.loop = event.target.checked`（循环播放开关当前无法关闭）。
3. cardWidth 归一化接线（工具已在批 1 引入）：
   - `src/nodes/HeaderNode.tsx:119` `getCardWidth()` 用 `normalizeCardWidth` 归一化（koenig 做法）。
   - `src/nodes/VideoNode.tsx:99-103` / `src/nodes/ImageNode.tsx:175`：`normalizeCardWidth(this.cardWidth) ?? 'regular'` 兜底。
   - ImageNodeComponent/VideoNodeComponent 的 `onCardWidthChange` 用 `isCardWidth` 校验（批 1 已部分完成，核实补齐）。
4. `$isXNode` 类型谓词统一：包装层各 `$isXNode` 仅 `ImageNode.tsx:205` 返回 `node is ImageNode` 谓词，其余返回 `boolean`——统一为谓词形式（先 grep 确认调用方兼容）。

### 批 4：组件层回归修复（TODO）

1. `src/nodes/CodeBlockNodeComponent.tsx`：(a) `darkMode` 重新传给 `CodeBlockCard`（koenig :43 传递，当前恒亮色预览）；(b) `handleToolbarEdit`（:57-60）恢复 `setEditing(true)` 并从 CardContext 取 `setEditing`——工具栏 Edit 按钮当前是空操作。
2. `src/components/ui/cards/ImageCard.tsx:83` — `imageUploader.progress.toFixed(0) < '100'` 字符串字典序比较 → 数值比较（koenig 是 `< 100`），上传中文案当前永不显示。
3. `src/components/ui/MediaUploader.tsx:33,150-151` + `src/components/ui/cards/HeaderCard/v2/HeaderCard.tsx:357,568` — `openImageEditor` 恢复 `{image, handleSave}` 签名（`usePinturaEditor.openEditor` 要求 image 非空才执行；HeaderCard 背景图与视频自定义缩略图的编辑按钮当前点击无反应）。ImageCard 路径（:134）仍传 image，不受影响，勿动。
4. `src/components/ui/SnippetActionToolbar.tsx` + `FloatingFormatToolbar.tsx:180` — 浮动工具栏"存为 snippet"当前是只读 input + no-op Insert。恢复 koenig 版的 `$generateJSONFromSelectedNodes` + `createSnippet` 逻辑（参考 koenig `koenig-lexical/src/components/ui/SnippetActionToolbar.tsx`）；卡片内场景已由 `SnippetCreateToolbar` 覆盖，勿动。
5. `src/components/ui/UrlInput.tsx` — 恢复 koenig 的 `UrlInputPlugin`（在主编辑器注册 `KEY_ENTER_COMMAND`，焦点在编辑器内回车也能提交 URL）；错误态关闭按钮从 "✕" 字符恢复为 CloseIcon。
6. `src/components/ui/ColorPicker.tsx:353,365` — `key={swatch.title ?? Math.random().toString()}` 破坏 reconciliation → 用 `swatch.title`（koenig 做法）；核实关闭 popover 时 `setShowChildren(false)` 重置是否应恢复。
7. `src/components/ui/FloatingFormatToolbar.tsx` — LinkInput 更新链接后把 selection 折叠到 focus 节点末尾（koenig `LinkActionToolbar` 行为，避免格式菜单误弹出）。
8. `src/components/ui/CardMenu.tsx:265,320` — snippet 删除后恢复 `closeMenu()`。
9. 核实项（先验证再动）：`src/nodes/CalloutNodeComponent.tsx` 的 `textEditor.setEditable(isEditing)` 同步、`toggleEmoji` 时 `setEditing(true)` 保持选中、`handleToolbarEdit` 派 `EDIT_CARD_COMMAND {focusEditor: false}`（koenig :33-45,:83-86）——确认 inkling 重写后这些行为是否真回退，若是则恢复。
10. e2e：针对性跑 code-block / snippet / header 相关 spec；已知 flake `test/e2e/cards/video-card.firefox.test.ts` 的 undo/redo 用例失败可重跑一次确认。

### 批 5：插件层修复（TODO）

1. `src/plugins/behaviour/keyboard-navigation/key-down.ts:10-14` — 恢复 `shouldIgnoreEvent(event)` 判断并 `return true`（koenig `KoenigBehaviourPlugin.tsx:418-430`）。现状无条件 `return false`，卡片内嵌编辑器（input/textarea/CodeMirror）中的键盘 cut/copy 会被 Lexical preventDefault。`shouldIgnoreEvent` 在 `src/utils/shouldIgnoreEvent.ts`，仍被 paste/cut 路径使用。
2. `src/plugins/ExternalControlPlugin.tsx` — `focusEditor` 恢复 `{defaultSelection: 'rootStart'}` 传参（`position` 参数当前失效）；保留 inkling 的 firstChild 空值守卫。
3. `src/markdown/markdown-html-renderer.ts:29-39` — `usedHeaders` 闭包挂在缓存的 MarkdownIt 实例上（`renderers` 缓存 :71-99），跨 `render()` 调用泄漏（第二次 `render('# Hello')` 得到 `hello2`）。修复：把去重状态绑定到单次 render（markdown-it `env` 或每次 render 前重置）。补「连续两次 render 相同标题得到相同 id」的回归测试。注：koenig 侧也坏（每次 `heading_open` 新建状态 = 完全不去重），这是双边修复，按正确语义实现即可。
4. `oxlint.config.ts` — `settings.react.version: '18.3.1'` 与实际 React 19.2.7 不符，改正。
5. 核实项：`src/plugins/AtLinkPlugin.tsx` `handleItemSelected` 中 koenig 对非文本链接有 `linkNode.setFormat(...)`，inkling 只保留 `textNode.setFormat(... ?? 0)`——核实是否为格式应用回退，若是则恢复。
6. 核实项：`src/plugins/behaviour/keyboard-navigation/escape.ts:16` 的 `editor._parentEditor` 裸访问（plan 011/023 已分类为遗留项）——顺手评估是否应走 `lexical-internals` 封装，不值得就记录不动。

### 批 6：邮件渲染回流（TODO）

1. header v2 Outlook VML：koenig `kg-default-nodes/src/nodes/header/renderers/v2/header-renderer.ts` 的 `generateMSOSplitHeaderImage`/`generateMSOContentWrapper`/`generateMSOContentClosing`（约 70 行）+ `hasDarkBg` → `kg-header-card-dark-bg/light-bg` class（class 名按 inkling 命名改）。移植时保持 inkling 的 `safeColor`/`isSafeUrl` 安全模式。补 email target 的渲染测试。
2. horizontalrule 邮件模板：koenig `kg-default-nodes/src/nodes/horizontalrule/horizontalrule-renderer.ts:7-51` 在 `target === 'email'` 时输出 Outlook 兼容的 table+边框模拟 hr；inkling 当前一律 `document.createElement('hr')`。移植 + 测试。
3. 图片 `<picture>`/现代格式支持（较大，先做可行性评估再实现，评估不通过则 STOP 报告）：koenig `image-renderer.ts:14-22,104-177` 的 `pictureImageFormats` feature flag 下 `<picture><source type=image/avif|webp>` 输出、`isAnimatedImage`（gif 跳过）、`utils/srcset-attribute.ts` 的 `format` 参数与 `getSrcsetAttribute`、`export-dom.ts` 的 `imageBaseUrl`/`canTransformImageToFormat` 选项、`utils/is-content-image.ts` 的 `imageBaseUrl` 参数（inkling 改名为 `is-local-content-image.ts` 时砍掉）。注意保持 inkling 的 `isSafeUrl` 插值防护。
4. 评估项（先评估后决定）：koenig `email-button.ts` 接口化重写（`EmailButtonOptions` + `style: 'fill'|'outline'`，依赖 `@tryghost/color-utils`）。inkling 有本地 `colorUtils.ts` 可替代依赖；若改造收益不大则记录不动。

### 批 7：死代码与存疑项清理（TODO）

1. `src/utils/set-src-background-from-parent.ts` — src 内零调用方（仅自身测试引用）。核实后删除（含测试）或接线，二选一并记录理由。
2. `src/nodes/ButtonNode.tsx:41-75` — `__textEditor` 嵌套编辑器序列化为 `json.text` 但 `decorate()` 未接入组件。核实用途：接线或移除，记录理由。
3. `src/components/ui/LinkActionToolbar.tsx` — 重写后在 src 内无任何引用。删除或接线。
4. `src/utils/dataSrcToFile.ts:17` — `Math.random` 改回 `crypto.getRandomValues`（koenig 原版）。
5. `src/nodes/base/utils/visibility.ts` — segment 文案/语义注释更新为 koenig 侧的 "comped + gift" 表述（核实后顺手）。
6. 核实项（默认不动，逐一记录结论）：`useMovable.ts` `currentX/Y` 初值 0 的 `(0,0)` 边界；`ButtonNode.tsx:79` `wrapperStyle="wide"`→`width="regular"`；`ToggleNode.tsx:47` `MINIMAL_NODES` vs koenig `BASIC_NODES`；VideoCard `borderStyle`；Gif item 的 div 化 a11y 回退；DragDropHandler 拖拽让位动画移除；`CardMenu.tsx` 的 `trackEvent` 空 stub 与 `inkling.local` 占位链接（含 `Gif/Error.tsx:19`）。
7. 产出：在 commit message 或 `docs/tech-debt-triage.md` 追加本节核实结论。

## 明确不做（产品裁剪，已确认）

- Ghost 会员/商务/产品卡片：paywall、signup、product、email、email-cta、call-to-action、transistor。
- Unsplash 集成（inkling 已用 Tenor/Klipy 替换）。
- header v1 渲染器、kg-card-factory 遗留包。
- Embed / Markdown wrapper 卡 / CallToAction 卡：`plans/020`、`plans/021` 已记录为有意决策（embed 路径已死、markdown 卡只保留 base 数据节点供 round-trip API）。若产品方向改变，另行评估引入（对比报告范围 A/F 有完整文件清单）。
- PropTypes 运行时校验恢复（inkling 作为发布库未保留，存疑但默认不动）。

## inkling 优势清单（任何批次不得回退）

`strict: true`；安全加固（`is-safe-url.ts`、`safeColor`、`cleanAttributes`、DOMParser 版 `sanitizeHtml`）；`async` 命令处理器全部同步化；`lexical-internals.ts` 私有 API 封装；`createCommand<T>()` 命令 payload 泛型；EmEnDash/WordCount/DragDropReorder 重写；判别联合 email options + 守卫；bookmark trim 与 `.catch` fallback 修复；构造器默认值统一 `??`；keyboard-navigation 模块化拆分；`useEffect` 依赖数组与清理函数；`revokePreviewUrl` 内存泄漏修复；e2e 条件等待 + SKIP-REASON 守卫。

## 最终验收

全部批次完成后：所有门禁 + 完整 `pnpm test:e2e` 一遍（已知 flake 除外），并将本文件状态列更新为 DONE。
