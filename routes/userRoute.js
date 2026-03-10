import { Router } from 'express'
import * as auth from '../middlewares/auth.js'
import * as user from '../controllers/user.js'

const router = Router()

// 公開路由
router.post('/register', user.register)
router.post('/login', user.login)

// 需要 JWT 驗證的路由 (使用 auth.token)
router.get('/profile', auth.token, user.profile)
router.delete('/logout', auth.token, user.logout)

// 無感刷新 Token 路由
// 前端會在收到 401 時，自動呼叫這條路徑來換新 Token
router.patch('/extend', auth.extend, user.extend)

// 購物車相關
router.get('/cart', auth.token, user.getCart)
router.post('/cart', auth.token, user.editCart)
router.delete('/cart/:p_id', auth.token, user.removeCartItem)

export default router
