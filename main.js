const express = require('express');
const session = require('express-session');
const MySqlStore = require('express-mysql-session')(session);

const app = express();

const options = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'webdb2026'
};
const sessionStore = new MySqlStore(options);

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));
app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
  store: sessionStore
}));

const rootRouter = require('./router/rootRouter');
const authRouter = require('./router/authRouter');
const codeRouter = require('./router/codeRouter');
const productRouter = require('./router/productRouter');
const personRouter = require('./router/personRouter');
const boardRouter = require('./router/boardRouter');
const purchaseRouter = require('./router/purchaseRouter');
const dbadminRouter = require('./router/dbadminRouter');

app.use('/', rootRouter);
app.use('/auth', authRouter);
app.use('/code', codeRouter);
app.use('/product', productRouter);
app.use('/person', personRouter);
app.use('/board', boardRouter);
app.use('/purchase', purchaseRouter);
app.use('/dbadmin', dbadminRouter);

app.get('/favicon.ico', (req, res) => res.writeHead(404));
app.listen(3000, () => console.log('Example app listening on port 3000'));
