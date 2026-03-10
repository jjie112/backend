import User from '../models/user.js'
import Product from '../models/product.js'
import { StatusCodes } from 'http-status-codes'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcrypt'

// 會員註冊
export const register = async (req, res) => {
  try {
    const { account, email, password } = req.body
    const userExists = await User.findOne({ $or: [{ account }, { email }] })

    if (userExists) {
      const field = userExists.account === account ? '帳號' : 'Email'
      return res.status(StatusCodes.BAD_REQUEST).json({
        success: false,
        message: `此${field}已註冊`,
      })
    }

    const role = email === process.env.ADMIN_EMAIL ? 'admin' : 'user'
    const user = await User.create({ account, email, password, role })

    res.status(StatusCodes.CREATED).json({
      success: true,
      message: '註冊成功',
      data: { id: user._id, account: user.account, role: user.role },
    })
  } catch (error) {
    res.status(StatusCodes.BAD_REQUEST).json({ success: false, message: error.message })
  }
}

// 會員登入 (確保每次都簽發新 Token)
export const login = async (req, res) => {
  try {
    const { account, password } = req.body
    const user = await User.findOne({
      $or: [{ account: account }, { email: account }],
    }).select('+password')

    if (!user) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: '帳號或密碼錯誤' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res
        .status(StatusCodes.UNAUTHORIZED)
        .json({ success: false, message: '帳號或密碼錯誤' })
    }

    // 1. 過濾掉資料庫中已經過期或無效的 Token (清理白名單)
    const validTokens = user.tokens.filter((t) => {
      try {
        jwt.verify(t, process.env.JWT_SECRET)
        return true
      } catch (error) {
        return false // 過期的會被濾掉
      }
    })

    // 2. 簽發一張「新鮮」的 Token
    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }, // 💡 測試用 10s，正式環境可改回 '7d'
    )

    // 3. 將新 Token 加入有效清單
    validTokens.push(token)
    user.tokens = validTokens
    await user.save()

    res.status(StatusCodes.OK).json({
      success: true,
      message: '登入成功',
      data: {
        token,
        user: { id: user._id, account: user.account, email: user.email, role: user.role },
      },
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}

// 會員登出
export const logout = async (req, res) => {
  try {
    // 移除目前使用的這張票
    req.user.tokens = req.user.tokens.filter((token) => token !== req.token)
    await req.user.save()
    res.status(StatusCodes.OK).json({ success: true, message: '登出成功' })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: '伺服器錯誤' })
  }
}

// 獲取個人資料
export const profile = async (req, res) => {
  try {
    res.status(StatusCodes.OK).json({
      success: true,
      data: {
        id: req.user._id,
        account: req.user.account,
        email: req.user.email,
        role: req.user.role,
      },
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}

// 更新購物車
export const editCart = async (req, res) => {
  try {
    const { p_id, quantity } = req.body
    const productExists = await Product.findById(p_id)
    if (!productExists)
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到該商品' })

    const user = await User.findById(req.user.id)
    const idx = user.cart.findIndex((item) => item.p_id.toString() === p_id)

    if (idx > -1) {
      user.cart[idx].quantity = parseInt(quantity)
    } else {
      user.cart.push({ p_id, quantity: quantity })
    }

    await user.save()
    res.status(StatusCodes.OK).json({ success: true, message: '購物車已更新', data: user.cart })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}

// 取得購物車
export const getCart = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate('cart.p_id')
    res.status(StatusCodes.OK).json({ success: true, data: user.cart })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}

// 刪除購物車商品
export const removeCartItem = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
    user.cart = user.cart.filter((item) => item.p_id.toString() !== req.params.p_id)
    await user.save()
    res.status(StatusCodes.OK).json({ success: true, message: '已移除商品', data: user.cart })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}

// 續期 Token (無感刷新)
export const extend = async (req, res) => {
  try {
    // 💡 確保從 req.user._id 拿 ID (這是 middleware/auth.js 傳進來的)
    const user = await User.findById(req.user._id).select('+tokens')

    if (!user) {
      return res.status(StatusCodes.NOT_FOUND).json({ success: false, message: '找不到使用者' })
    }

    // 檢查舊票是否還在資料庫白名單內
    const idx = user.tokens.findIndex((t) => t === req.token)
    if (idx === -1) {
      return res.status(StatusCodes.UNAUTHORIZED).json({ success: false, message: '驗證失敗' })
    }

    // 簽發新票 (記得改回 7d)
    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d', // 測試 10s
    })

    // 舊票換新票
    user.tokens[idx] = token
    await user.save()

    res.status(StatusCodes.OK).json({
      success: true,
      result: token, // 💡 這裡對應前端 api.js 的 data.result
    })
  } catch (error) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({ success: false, message: error.message })
  }
}
