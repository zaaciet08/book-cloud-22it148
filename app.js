require('dotenv').config();
const express = require('express');
const { engine } = require('express-handlebars');
const session = require('express-session');
const ConnectMongo = require('connect-mongo');
const MongoStore = ConnectMongo.create ? ConnectMongo : ConnectMongo.default;
const { BookReadModel, BookWriteModel } = require('./db');

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Cấu hình View Engine Handlebars
app.engine('hbs', engine({ extname: '.hbs' }));
app.set('view engine', 'hbs');
app.set('views', './views');

// Cấu hình Stateless Session lưu trữ trực tiếp xuống MongoDB Atlas (Cluster)
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret_22it148',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI_WRITE,
    collectionName: 'sessions',
    ttl: 14 * 24 * 60 * 60 // 14 ngày
  }),
  cookie: { maxAge: 1000 * 60 * 60 * 24 }
}));

// VAT = (Chữ số cuối MSSV + 6)% -> 8 + 6 = 14%
const LAST_DIGIT = parseInt(process.env.LAST_DIGIT || '8', 10);
const VAT_RATE = LAST_DIGIT + 6;
const PREFIX = process.env.PREFIX_MSSV || '148';

// Luồng ĐỌC (Read Route) -> Dùng BookReadModel
app.get('/', async (req, res) => {
  try {
    const books = await BookReadModel.find().lean();
    
    const error = req.session.errorMessage || null;
    const success = req.session.successMessage || null;
    req.session.errorMessage = null;
    req.session.successMessage = null;

    res.render('index', {
      books,
      studentName: process.env.STUDENT_NAME,
      studentId: process.env.STUDENT_ID,
      vatRate: VAT_RATE,
      prefix: PREFIX,
      error,
      success
    });
  } catch (err) {
    res.status(500).send("Lỗi đọc dữ liệu từ Read Database: " + err.message);
  }
});

// Luồng GHI (Write Route) -> Dùng BookWriteModel
app.post('/books', async (req, res) => {
  const { bookCode, title, basePrice } = req.body;

  // 1. Kiểm tra tiền tố bắt buộc 3 số cuối MSSV (148)
  if (!bookCode.startsWith(PREFIX)) {
    req.session.errorMessage = `Từ chối xử lý: Mã sách phải bắt đầu bằng tiền tố "${PREFIX}"!`;
    return res.redirect('/');
  }

  // 2. Tự động tính giá sau thuế
  const price = parseFloat(basePrice);
  const finalPrice = Math.round(price * (1 + VAT_RATE / 100));

  try {
    await BookWriteModel.create({
      bookCode,
      title,
      basePrice: price,
      vat: VAT_RATE,
      finalPrice
    });
    req.session.successMessage = "Thêm sách mới thành công qua Write Connection!";
    res.redirect('/');
  } catch (err) {
    req.session.errorMessage = "Lỗi khi ghi dữ liệu: " + err.message;
    res.redirect('/');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server chạy tại: http://localhost:${PORT}`);
});