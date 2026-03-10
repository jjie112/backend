import { Router } from 'express'
import * as auth from '../middlewares/auth.js' // 你的登入檢查中間件
import {
  createOrder,
  getOrders,
  updateOrderStatus,
  deleteOrder,
  getAllOrders,
  adminUpdateOrder,
  adminDeleteOrder,
} from '../controllers/order.js'

// 建立路由器
const router = Router()

// 建立訂單 (POST /orders)
router.post('/', auth.token, createOrder)

// 取得自己的訂單紀錄 (GET /orders)
router.get('/', auth.token, getOrders)

// 修改訂單狀態 (PATCH /orders/:id)
router.patch('/:id', auth.token, updateOrderStatus)

// 刪除訂單 (DELETE /orders/:id)
router.delete('/:id', auth.token, deleteOrder)

// 只有管理員可以看所有訂單
router.get('/all', auth.token, auth.admin, getAllOrders)

// 只有管理員可以強制修改任何訂單狀態
router.patch('/admin/:id', auth.token, auth.admin, adminUpdateOrder)

// 只有管理員可以強制刪除任何訂單
router.delete('/admin/:id', auth.token, auth.admin, adminDeleteOrder)

export default router
