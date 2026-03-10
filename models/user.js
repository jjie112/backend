import { Schema, model, ObjectId } from 'mongoose'
import bcrypt from 'bcrypt'
import validator from 'validator'

// 定義 User 模型
const userSchema = new Schema(
  {
    account: {
      type: String,
      required: [true, '帳號必填'],
      minlength: [3, '帳號長度至少 3 個字元'],
      maxlength: [20, '帳號長度最多 20 個字元'],
      unique: true,
      trim: true,
      validate: {
        validator: (value) => {
          return validator.isAlphanumeric(value)
        },
        message: '帳號只能包含英文字母和數字',
      },
    },
    email: {
      type: String,
      required: [true, 'Email 必填'],
      unique: true,
      validate: {
        validator: (value) => validator.isEmail(value),
        message: 'Email 格式錯誤',
      },
    },
    password: {
      type: String,
      required: [true, '密碼必填'],
      minlength: [6, '密碼長度至少 6 個字元'],
      maxlength: [100, '密碼長度最多 100 個字元'],
      select: false,
    },
    role: {
      type: String,
      enum: {
        values: ['user', 'admin'],
        message: '角色權限錯誤',
      },
      default: 'user', // 預設一定是普通會員，這點非常正確
    },
    tokens: {
      type: [String],
    },
    cart: {
      type: [
        {
          p_id: {
            type: ObjectId,
            ref: 'products', // 這裡要填你產品 Model 的名稱（通常是小寫複數）
            required: [true, '商品 ID 必填'],
          },
          quantity: {
            type: Number,
            required: [true, '數量必填'],
            min: [1, '數量不能小於 1'],
          },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  },
)

// 中介軟體(middlewares)：在存進資料庫前，自動幫密碼加密
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return
  // 加密
  this.password = await bcrypt.hash(this.password, 10)
})

export default model('users', userSchema)
