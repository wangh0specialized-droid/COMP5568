# BlockLend 前端

这是 COMP5568 项目中的前端模块，用于连接本地 Hardhat 网络并演示借贷协议的基础交互流程。

## 功能

- 连接 MetaMask 或本地开发账户
- 查看协议总览
- 查看资产市场信息
- 查看个人持仓
- 执行 Supply、Borrow、Repay、Withdraw
- 开启或关闭抵押属性

## 运行方式

先确保项目根目录中的本地链和合约已经启动并部署：

```bash
npm run node
npm run deploy
```

然后在当前前端目录执行：

```bash
npm install
npm run dev
```

默认访问地址：

- `http://127.0.0.1:3000/`

本地链参数：

- RPC: `http://127.0.0.1:8545`
- Chain ID: `31337`

## 技术栈

- React
- TypeScript
- Vite
- ethers v6
