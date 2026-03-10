import passport from 'passport'
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt'
import User from '../models/user.js'

// 這裡的 opts 是 JWT 驗證策略的選項，根據你的需求進行調整
// 這裡的 JWT_SECRET 是你在 .env 檔案裡設定的密鑰，務必確保它足夠複雜且安全
const opts = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  secretOrKey: process.env.JWT_SECRET,
  passReqToCallback: true,
  ignoreExpiration: false,
  clockTolerance: 0, // 讓 10s 過期精準生效
}

// JWT 驗證策略
passport.use(
  'jwt',
  new JwtStrategy(opts, async (req, payload, done) => {
    try {
      const token = req.headers.authorization?.split(' ')[1]
      // 務必確認 Payload 裡是 id 還是 _id (對照 sign 時的 key)
      const user = await User.findById(payload.id || payload._id).select('+tokens')

      if (!user) {
        return done(null, false, { message: '帳號不存在' })
      }

      if (!user.tokens.includes(token)) {
        return done(null, false, { message: '驗證失敗或已登出' })
      }

      return done(null, user, { token })
    } catch (error) {
      return done(error, false)
    }
  }),
)

export default passport
