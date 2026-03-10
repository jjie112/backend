import passport from 'passport'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'

// 強制的 Token 驗證，只有提供了有效的 Token 的使用者才能繼續執行後續的操作。
export const token = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error, user, info) => {
    // 偵錯用：若過期會顯示 "jwt expired"
    if (info?.message) console.log('🛡️ Passport 驗證狀態:', info.message)

    if (error || !user) {
      return res.status(StatusCodes.UNAUTHORIZED).json({
        success: false,
        message: info?.message === 'jwt expired' ? 'Token 已過期' : info?.message || '請重新登入',
      })
    }

    req.user = user
    req.token = req.headers.authorization?.split(' ')[1] || ''
    next()
  })(req, res, next)
}

// 可選的 Token 驗證，如果使用者提供了有效的 Token，則將使用者資訊附加到 req.user 上；如果沒有提供 Token 或 Token 無效，則繼續執行後續的操作，而不會返回錯誤。
export const optionalToken = (req, res, next) => {
  passport.authenticate('jwt', { session: false }, (error, user) => {
    if (user) {
      req.user = user
      req.token = req.headers.authorization?.split(' ')[1] || ''
    }
    next()
  })(req, res, next)
}

// 檢查使用者是否具有 admin 權限，只有 admin 才能繼續執行後續的操作。
export const admin = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 1)) {
    next()
  } else {
    res.status(StatusCodes.FORBIDDEN).json({
      success: false,
      message: '權限不足',
    })
  }
}

// 延長 Token 的有效期，讓使用者在 Token 過期後仍能繼續使用原有的 Token 進行操作，直到他們主動登出或換取新的 Token。
export const extend = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token)
    return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: '缺少 Token' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { ignoreExpiration: true })
    req.user = { _id: decoded.id || decoded._id }
    req.token = token
    next()
  } catch (error) {
    return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: '無效的 Token' })
  }
}
