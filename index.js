import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import productRoute from './routes/productRoute.js'
import userRoute from './routes/userRoute.js'
import './passport/passport.js'
import orderRoute from './routes/orderRoute.js'

// 連接
mongoose
  .connect(process.env.DB_URL)
  .then(() => {
    console.log('🍃 MongoDB 連線成功！')
    console.log('📂 目前使用的資料庫名稱：', mongoose.connection.name)
  })
  .catch((error) => {
    console.log('❌ 資料庫連線失敗...')
    console.error('錯誤名稱:', error.name)
    console.error('錯誤訊息:', error.message)
    if (error.message.includes('querySrv') && error.message.includes('ECONNREFUSED')) {
      console.log('-------------------------------------------------------')
      console.log('💡 提示: 這通常是網路 DNS 阻擋了 SRV 查詢。')
      console.log('👉 請嘗試將 .env 中的 DB_URL 改為「標準連線字串」')
      console.log('   (即使用 mongodb:// 開頭，而非 mongodb+srv://)')
      console.log('-------------------------------------------------------')
    } else if (
      error.name === 'MongooseServerSelectionError' &&
      error.message.includes('whitelisted')
    ) {
      console.log('-------------------------------------------------------')
      console.log('💡 提示: 您的 IP 位址尚未被 MongoDB Atlas 允許連線。')
      console.log('👉 請前往 MongoDB Atlas 後台 -> Network Access -> Add IP Address')
      console.log('   並將您的 IP 加入白名單 (或選擇 Allow Access from Anywhere 進行測試)。')
      console.log('-------------------------------------------------------')
    }
  })

const app = express()

app.use(cors())
app.use(express.json())

// app.use((req, res, next) => {
//   console.log(`📡 [收到請求] ${req.method} ${req.url}`)
//   next()
// })

app.use('/api/products', productRoute)
app.use('/api/users', userRoute)
app.use('/api/orders', orderRoute)

// 檢查環境變數是否正確讀取，避免連線時才報錯
if (!process.env.DB_URL) {
  console.error('❌ 嚴重錯誤：找不到 DB_URL 環境變數！請檢查 .env 檔案位置與內容。')
} else {
  // 為了除錯，印出部分連線資訊 (隱藏密碼)
  const url = process.env.DB_URL
  const maskedUrl = url.includes('@') ? 'mongodb+srv://*****:*****@' + url.split('@')[1] : url
  console.log(`🔍 嘗試連線至資料庫: ${maskedUrl}`)
}

app.get('/', (req, res) => {
  res.send('🍵 茶電商後端 API 運作中！')
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`✅ 伺服器啟動成功：http://localhost:${PORT}`)
})
