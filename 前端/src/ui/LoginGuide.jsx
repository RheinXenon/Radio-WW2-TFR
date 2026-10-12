// 未登录引导卡片：揭幕后查一次登录态，未登录就弹卡等用户选择；
// 「去登录」打开云音乐面板（面板一开卡片即让位），「暂不」与点背景等效——本次页面不再弹
import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { useRadio } from '../store.js'
import { cloudLibrary } from '../netease/library.js'
import './netease.css'

let seen = false // 本次页面只弹一次：换主题重新揭幕也不再来

export default function LoginGuide() {
  const [shown, setShown] = useState(false)
  const panel = useRadio((s) => s.panel)

  useEffect(() => { if (panel) setShown(false) }, [panel])

  useEffect(() => {
    if (seen) return
    cloudLibrary.refreshSession()
      .then((s) => { if (!s.nickname) { seen = true; setShown(true) } })
      .catch(() => { /* 后端未起或网络异常时不弹 */ })
  }, [])

  return (
    <AnimatePresence>
      {shown && (
        <motion.div
          className="login-guide"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35 }}
          onPointerDown={() => setShown(false)}
        >
          <motion.div
            className="login-guide__card"
            initial={{ y: 16, filter: 'blur(6px)' }}
            animate={{ y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div className="panel__sub sc">Netease Cloud · Login</div>
            <h2 className="panel__title">强烈建议登录网易云账号</h2>
            <div className="hairline" style={{ margin: '16px 0 12px' }} />
            <p className="login-guide__text">
              未登录时以匿名访客取流：免费歌曲也有概率被限流而播放失败，付费（VIP）歌曲必须登录后才能播放。登录后还可导入自己账号的歌单。
            </p>
            <div className="login-guide__btns">
              <button className="pbtn login-guide__primary" onClick={() => useRadio.setState({ panel: 'netease' })}>去登录</button>
              <button className="pbtn" onClick={() => setShown(false)}>暂不</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
