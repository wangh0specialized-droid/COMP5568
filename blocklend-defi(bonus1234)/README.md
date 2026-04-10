# BlockLend — DeFi 借贷协议前端

BlockLend 是一个去中心化借贷协议的前端仪表盘，部署在 Sepolia 测试网上。用户可以通过 MetaMask 钱包连接，进行存款、借款、还款、取款等核心操作，同时支持清算、闪电贷、预言机价格管理和治理代币奖励等高级功能。

## 功能概览

### 核心功能
- **存款 (Supply)** — 将 ERC-20 代币存入协议作为抵押品，赚取利息
- **借款 (Borrow)** — 以抵押品为担保借出代币
- **还款 (Repay)** — 偿还借款以降低债务
- **取款 (Withdraw)** — 取出已存入的代币
- **抵押品管理** — 开启或关闭资产的抵押属性

### 高级功能
- **清算 (Liquidation)** — 当借款人的健康因子低于 1 时，第三方可以清算其头寸
- **闪电贷 (Flash Loan)** — 无需抵押即可借出任意数量的代币，在同一交易内归还并支付 0.09% 手续费
- **预言机集成 (Oracle)** — 通过 Chainlink 预言机获取实时资产价格，管理员可切换手动/Chainlink 价格模式
- **治理代币奖励 (GOV Rewards)** — 存款人和借款人可领取 GOV 治理代币奖励

### 仪表盘视图
- **Overview** — 协议总览：总抵押、总债务、可用借款额度、健康因子
- **Markets** — 资产市场：USDC 和 WETH 的存款/借款利率、利用率、流动性
- **Portfolio** — 个人持仓：存款余额、借款余额、待领取奖励
- **Liquidation** — 清算面板：清算操作、闪电贷执行、管理员价格管理

## 项目结构

```
blocklend-defi/
├── src/
│   ├── App.tsx                    # 应用入口
│   ├── main.tsx                   # React 渲染入口
│   ├── index.css                  # 全局样式 (Tailwind CSS)
│   ├── components/
│   │   ├── Dashboard.tsx          # 主仪表盘布局与路由
│   │   ├── Views.tsx              # 各功能面板组件
│   │   └── UI.tsx                 # 通用 UI 组件 (Button, Badge, GlassCard)
│   ├── contracts/
│   │   └── constants.ts           # 合约地址、ABI、网络配置
│   ├── hooks/
│   │   ├── useWeb3.tsx            # MetaMask 连接与网络管理
│   │   └── useProtocol.tsx        # 协议数据获取与交易执行
│   └── lib/
│       └── utils.ts               # 格式化工具函数
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 环境要求

- **Node.js** >= 18
- **MetaMask** 浏览器扩展
- **网络**: Sepolia Testnet (Chain ID: 11155111)

## 快速开始

```bash
#修改文件名
blocklend-defi(bonus1234)->blocklend-defi

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

启动后在浏览器中打开 `http://127.0.0.1:3000/`，使用 MetaMask 连接 Sepolia 网络即可使用。

## 已部署合约地址 (Sepolia)

| 合约                | 地址                                       |
| ----------------- | ---------------------------------------- |
| MockUSDC          | `0x960BB2E40d6FD61Cb2a54C6597888aEa4ae1b2b6` |
| MockWETH          | `0x1981631026c3A3FC1C9de4545082607AA910eb08` |
| GOV Token         | `0xf6c756d4a07fb991b0371BAcbc739E2D4eC5157B` |
| InterestRateModel | `0x9f6Fc78872C8cfb07756cEF2041F1B6FbFA71668` |
| PriceOracle       | `0xf693813547Cbe993803cb6d5036458D92003a0FA` |
| LendingPool       | `0xD6C093f145467482aDA8e74c3Ca2001715979761` |
| FlashLoanReceiver | `0x0C5a2699683ccBC4FC3De3F4Be1dcfCd16e94743` |

## 技术栈

- **React 19** — UI 框架
- **TypeScript** — 类型安全
- **Vite** — 构建工具
- **ethers.js v6** — 区块链交互库
- **Tailwind CSS v4** — 样式框架
- **Lucide React** — 图标库

## 关键设计说明

### 健康因子 (Health Factor)
健康因子 = 总抵押价值 / 总借款价值。当健康因子低于 1 时，借款人的头寸可被清算。前端实时显示健康因子并以颜色标识风险等级（绿色 > 2、黄色 1.2–2、红色 < 1.2）。

### 利率模型
采用 Kinked 利率模型，基于资金利用率动态调整借款利率：
- 利用率 < 80%: 利率缓慢上升
- 利用率 > 80%: 利率快速上升，激励存款人提供流动性

### 闪电贷
通过部署的 FlashLoanReceiver 合约执行闪电贷。用户调用 `startFlashLoan()` 发起闪电贷，Receiver 合约在回调中借入代币并立即归还，支付 0.09% 手续费。闪电贷面板会显示 Receiver 合约的代币余额，方便对比手续费累积情况。

### 预言机价格
USDC 使用手动定价模式（固定 $1），WETH 使用 Chainlink 预言机获取实时价格。管理员可在 Liquidation 面板中切换价格模式或手动设置价格。
