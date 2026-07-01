# TMUX Deploy Note

## Start service

```bash
cd /home/slowpoke1025/Experiment
pnpm build
tmux new -s aiwa
pnpm start -H 127.0.0.1 -p 1025
```

離開但讓服務繼續跑：

```bash
Ctrl-b d
```

## Check service

列出 session：

```bash
tmux ls
```

回到服務畫面：

```bash
tmux attach -t aiwa
```

檢查網址：

```bash
curl -I http://127.0.0.1:1025
curl -I https://ai-workplace-assistant.nblab.im.ntu.edu.tw
```

## Update code

```bash
cd /home/slowpoke1025/Experiment
tmux attach -t aiwa
```

先停掉目前 server：

```bash
Ctrl-c
```

更新並重啟：

```bash
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
pnpm start -H 127.0.0.1 -p 1025
```

再離開 tmux：

```bash
Ctrl-b d
```

## Stop service

```bash
tmux attach -t aiwa
```

```bash
Ctrl-c
exit
```
