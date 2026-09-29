裂隙征途 · Android 离线版

安装 release 文件夹中的 RiftExpedition-v1.0.0-Android.apk 即可离线游玩。
如果系统提示“是否允许安装未知应用”，请仅为你使用的文件管理器临时授权。

应用不申请网络权限，完整网页、脚本、图片与音效均存放在 APK 内。
存档保存在应用本地数据中；卸载应用或清除应用数据会删除存档。

—— 开发者：签名密钥 ——

build-apk.ps1 第一次运行时会在 packaging/android/.keys/ 生成签名密钥 rift-expedition-release.keystore
和随机密码 keystore-password.txt。这个目录只保存在本机（已被 .gitignore 忽略），不要提交到 GitHub。
请把这两个文件备份到网盘或 U 盘：同一把密钥签出的新版 APK 才能直接覆盖安装旧版。

想换一把新密钥（例如大版本更新时）：删掉 .keys 目录里的这两个文件，再运行 build-apk.ps1 即可。
换密钥后，已安装的旧版无法直接升级，玩家需要先卸载旧版再安装新版。
卸载会清除应用里的存档，请提醒玩家先在游戏的“存档”页面导出存档，装好新版后再导入。
