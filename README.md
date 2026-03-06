# Pixel Room Chat

一个独立于 `Microverse` 的网页多人像素聊天室仓库。它复用了 `Microverse` 中的部分 MIT 素材，保留了俯视角像素办公室和人物角色的视觉语言，但技术实现完全是网页栈。

## 技术栈

- `client`: React + Vite + Phaser 3
- `server`: Node.js + Express + Socket.IO

## 当前能力

- 浏览器进入同一个房间
- 每个用户一个像素小人
- `WASD` 或方向键移动
- 在线用户列表
- 房间聊天消息流
- 角色头顶即时聊天气泡
- 可选 8 个 `Microverse` 角色皮肤

## 本地启动

先确保已经安装 Node.js 24 LTS 或更高版本。

```bash
npm install
npm --prefix server install
npm --prefix client install
npm run dev
```

前端默认在 `http://localhost:5173`

后端默认在 `http://localhost:3001`

## 公网部署

仓库里已经带了 [`render.yaml`](/C:/Users/Ygzz1/Desktop/proj/pixel-room-chat/render.yaml)，最省事的做法是直接部署到 Render：

1. 把仓库推到 GitHub。
2. 在 Render 里选择 `New +` -> `Blueprint`。
3. 连接这个 GitHub 仓库。
4. Render 会创建两个服务：
   - `pixel-room-chat-server`
   - `pixel-room-chat-client`
5. 第一次创建完成后，先记下它们各自分配到的 `onrender.com` 地址。
6. 回到环境变量，分别填写：
   - 后端服务 `CLIENT_URL`: 你的前端站点地址，例如 `https://pixel-room-chat-client.onrender.com`
   - 前端服务 `VITE_SERVER_URL`: 你的后端地址，例如 `https://pixel-room-chat-server.onrender.com`
7. 对前后端各执行一次 `Manual Deploy` 或 `Redeploy`。
8. 部署完成后，把前端地址发给朋友即可。

### 推到 GitHub

如果你还没有远程仓库，可以先在 GitHub 创建一个空仓库，然后执行：

```bash
git remote add origin <你的仓库地址>
git add .
git commit -m "Initial pixel room chat"
git push -u origin main
```

本地环境变量示例：

- [`client/.env.example`](/C:/Users/Ygzz1/Desktop/proj/pixel-room-chat/client/.env.example)
- [`server/.env.example`](/C:/Users/Ygzz1/Desktop/proj/pixel-room-chat/server/.env.example)

## 素材说明

本仓库在 `client/public/assets/microverse` 中包含了来自原始 `Microverse` 项目的部分素材。

- 角色 sprite sheets: `asset/characters/body/*x32.png`
- 房间底图参考与像素素材风格来自 `Microverse`

这些素材来自 `Microverse` 仓库，原项目使用 MIT License。详细说明见 [`THIRD_PARTY_NOTICES.md`](/C:/Users/Ygzz1/Desktop/proj/pixel-room-chat/THIRD_PARTY_NOTICES.md)。
