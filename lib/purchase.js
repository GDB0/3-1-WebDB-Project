const db = require('./db');
const sanitizeHtml = require('sanitize-html');
const util = require('./util');

function clean(v){ return sanitizeHtml(String(v ?? '')); }
function today(){
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  const h = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  const se = String(d.getSeconds()).padStart(2,'0');
  return `${y}.${m}.${day} ${h}시 ${mi}분 ${se}초`;
}
function alertMove(res,msg,url){
  res.writeHead(200, {'Content-Type':'text/html; charset=utf-8'});
  res.end(`<script>alert('${msg}'); location.href='${url}';</script>`);
}
function customerOnly(req,res,next){
  const auth = util.authInfo(req);
  if(auth.cls !== 'CST') return alertMove(res, '고객으로 로그인해야 이용할 수 있습니다.', '/');
  next(auth);
}
function productOne(prodId, cb){
  db.query('SELECT * FROM product WHERE prod_id=?', [prodId], cb);
}
function purchaseListSql(where){
  return `SELECT pu.*, p.name AS product_name, p.image, pe.name AS person_name
          FROM purchase pu
          LEFT JOIN product p ON pu.prod_id = p.prod_id
          LEFT JOIN person pe ON pu.loginid = pe.loginid
          ${where || ''}
          ORDER BY pu.purchase_id DESC`;
}
function ensureCartQty(cb){
  db.query('ALTER TABLE cart ADD COLUMN qty int DEFAULT 1', (err)=>{
    // 이미 qty 컬럼이 있으면 ER_DUP_FIELDNAME 오류가 나므로 무시한다.
    if(err && err.code !== 'ER_DUP_FIELDNAME') return cb(err);
    cb(null);
  });
}
function ensurePurchaseRefund(cb){
  db.query("ALTER TABLE purchase ADD COLUMN refund varchar(1) NOT NULL DEFAULT 'N'", (err)=>{
    // 이미 refund 컬럼이 있으면 ER_DUP_FIELDNAME 오류가 나므로 무시한다.
    if(err && err.code !== 'ER_DUP_FIELDNAME') return cb(err);
    cb(null);
  });
}
function getBodyQty(body, cartId){
  return Math.max(1, Number((body.qty && body.qty[cartId]) || body[`qty[${cartId}]`] || 1));
}
function cartListSql(where){
  return `SELECT c.*, IFNULL(c.qty, 1) AS qty, p.name AS product_name, p.price, p.image, pe.name AS person_name
          FROM cart c
          LEFT JOIN product p ON c.prod_id = p.prod_id
          LEFT JOIN person pe ON c.loginid = pe.loginid
          ${where || ''}
          ORDER BY c.cart_id DESC`;
}
function getPersonsProducts(cb){
  db.query('SELECT loginid, name FROM person ORDER BY loginid; SELECT prod_id, name FROM product ORDER BY prod_id', (err, results)=>{
    if(err) return cb(err);
    cb(null, results[0], results[1]);
  });
}

module.exports = {
  purchasedetail: (req,res)=>customerOnly(req,res,()=>{
    productOne(req.params.prodId, (err, products)=>{
      if(err) throw err;
      if(products.length===0) return res.redirect('/');
      util.render(req,res,'purchaseDetail.ejs',{product:products[0]});
    });
  }),
  purchase_process: (req,res)=>customerOnly(req,res,(auth)=>{
    const prodId = clean(req.body.prod_id);
    const qty = Math.max(1, Number(req.body.qty || 1));
    productOne(prodId, (err, products)=>{
      if(err) throw err;
      if(products.length===0) return res.redirect('/');
      const p = products[0];
      const price = Number(p.price || 0);
      const total = price * qty;
      const point = Math.floor(total * 0.005);
      db.query(`INSERT INTO purchase(loginid, prod_id, date, price, point, qty, total, payYN, cancel)
                VALUES(?, ?, ?, ?, ?, ?, ?, 'Y', 'N')`,
        [auth.loginid, prodId, today(), price, point, qty, total], (e)=>{
          if(e) throw e;
          res.redirect('/purchase');
        });
    });
  }),
  purchase: (req,res)=>customerOnly(req,res,(auth)=>{
    ensurePurchaseRefund((alterErr)=>{
      if(alterErr) throw alterErr;
      db.query(purchaseListSql('WHERE pu.loginid=?'), [auth.loginid], (err, purchases)=>{
        if(err) throw err;
        util.render(req,res,'purchase.ejs',{purchases});
      });
    });
  }),
  cancel_process: (req,res)=>customerOnly(req,res,(auth)=>{
    db.query(`UPDATE purchase SET cancel='Y' WHERE purchase_id=? AND loginid=?`, [req.params.purchaseId, auth.loginid], (err)=>{
      if(err) throw err;
      res.redirect('/purchase');
    });
  }),
  cart_process: (req,res)=>customerOnly(req,res,(auth)=>{
    ensureCartQty((alterErr)=>{
      if(alterErr) throw alterErr;
      const prodId = clean(req.body.prod_id);
      const qty = Math.max(1, Number(req.body.qty || 1));
      db.query('SELECT cart_id FROM cart WHERE loginid=? AND prod_id=?', [auth.loginid, prodId], (err, r)=>{
        if(err) throw err;
        if(r.length > 0){
          return db.query('UPDATE cart SET qty=?, date=? WHERE cart_id=?', [qty, today(), r[0].cart_id], (e)=>{
            if(e) throw e;
            alertMove(res, '이미 장바구니에 있는 상품이라 수량을 수정했습니다.', '/purchase/cart');
          });
        }
        db.query('INSERT INTO cart(loginid, prod_id, date, qty) VALUES(?, ?, ?, ?)', [auth.loginid, prodId, today(), qty], (e)=>{
          if(e) throw e;
          res.redirect('/purchase/cart');
        });
      });
    });
  }),
  cart: (req,res)=>customerOnly(req,res,(auth)=>{
    ensureCartQty((alterErr)=>{
      if(alterErr) throw alterErr;
      db.query(cartListSql('WHERE c.loginid=?'), [auth.loginid], (err, carts)=>{
      if(err) throw err;
      util.render(req,res,'cart.ejs',{carts});
      });
    });
  }),
  cartpurchase_process: (req,res)=>customerOnly(req,res,(auth)=>{
    let checks = req.body.check || [];
    if(!Array.isArray(checks)) checks = [checks];
    if(checks.length === 0 || checks[0] === '') return alertMove(res, '구매할 상품을 선택해 주세요', '/purchase/cart');
    const qtys = req.body.qty || {};
    const ids = checks.map(v=>Number(v)).filter(v=>v>0);
    const placeholders = ids.map(()=>'?').join(',');
    db.query(cartListSql(`WHERE c.loginid=? AND c.cart_id IN (${placeholders})`), [auth.loginid, ...ids], (err, carts)=>{
      if(err) throw err;
      if(carts.length === 0) return alertMove(res, '구매할 상품을 선택해 주세요', '/purchase/cart');
      const vals = carts.map(c=>{
        const q = getBodyQty(req.body, c.cart_id);
        const price = Number(c.price || 0); const total = price*q;
        return [auth.loginid, c.prod_id, today(), price, Math.floor(total*0.005), q, total, 'Y', 'N'];
      });
      db.query('INSERT INTO purchase(loginid, prod_id, date, price, point, qty, total, payYN, cancel) VALUES ?', [vals], (e)=>{
        if(e) throw e;
        db.query(`DELETE FROM cart WHERE loginid=? AND cart_id IN (${placeholders})`, [auth.loginid, ...ids], (e2)=>{
          if(e2) throw e2;
          res.redirect('/purchase');
        });
      });
    });
  }),
  cartdelete_process: (req,res)=>customerOnly(req,res,(auth)=>{
    let checks = req.body.check || [];
    if(!Array.isArray(checks)) checks = [checks];
    const ids = checks.map(v=>Number(v)).filter(v=>v>0);
    if(ids.length === 0) return alertMove(res, '삭제할 상품을 선택해 주세요', '/purchase/cart');
    const placeholders = ids.map(()=>'?').join(',');
    db.query(`DELETE FROM cart WHERE loginid=? AND cart_id IN (${placeholders})`, [auth.loginid, ...ids], (err)=>{
      if(err) throw err;
      res.redirect('/purchase/cart');
    });
  }),
  cartview: (req,res)=>{
    ensureCartQty((alterErr)=>{ if(alterErr) throw alterErr; db.query(cartListSql(''), (err, carts)=>{ if(err) throw err; util.render(req,res,'cartView.ejs',{carts}); }); });
  },
  cartupdate: (req,res)=>{
    db.query('SELECT * FROM cart WHERE cart_id=?', [req.params.cartId], (err, cart)=>{
      if(err) throw err; if(cart.length===0) return res.redirect('/purchase/cart/view');
      getPersonsProducts((e, persons, products)=>{ if(e) throw e; util.render(req,res,'cartU.ejs',{cart:cart[0], persons, products}); });
    });
  },
  cartupdate_process: (req,res)=>{
    const p=req.body;
    db.query('UPDATE cart SET loginid=?, prod_id=?, date=? WHERE cart_id=?', [clean(p.loginid), clean(p.prod_id), clean(p.date), clean(p.cart_id)], (err)=>{
      if(err) throw err; res.redirect('/purchase/cart/view');
    });
  },
  cartdelete_admin: (req,res)=>{
    db.query('DELETE FROM cart WHERE cart_id=?', [req.params.cartId], (err)=>{ if(err) throw err; res.redirect('/purchase/cart/view'); });
  },
  purchaseview: (req,res)=>{
    ensurePurchaseRefund((alterErr)=>{
      if(alterErr) throw alterErr;
      db.query(purchaseListSql(''), (err, purchases)=>{ if(err) throw err; util.render(req,res,'purchaseView.ejs',{purchases}); });
    });
  },
  purchaseupdate: (req,res)=>{
    ensurePurchaseRefund((alterErr)=>{
      if(alterErr) throw alterErr;
      db.query('SELECT * FROM purchase WHERE purchase_id=?', [req.params.purchaseId], (err, purchase)=>{
        if(err) throw err; if(purchase.length===0) return res.redirect('/purchase/view');
        getPersonsProducts((e, persons, products)=>{ if(e) throw e; util.render(req,res,'purchaseU.ejs',{purchase:purchase[0], persons, products}); });
      });
    });
  },
  purchaseupdate_process: (req,res)=>{
    ensurePurchaseRefund((alterErr)=>{
      if(alterErr) throw alterErr;
      const p=req.body;
      const qty=Number(p.qty||1), price=Number(p.price||0), total=Number(p.total || price*qty);
      db.query(`UPDATE purchase SET loginid=?, prod_id=?, date=?, price=?, point=?, qty=?, total=?, payYN=?, cancel=?, refund=? WHERE purchase_id=?`,
        [clean(p.loginid), clean(p.prod_id), clean(p.date), price, Number(p.point||0), qty, total, clean(p.payYN||'N'), clean(p.cancel||'N'), clean(p.refund||'N'), clean(p.purchase_id)],
        (err)=>{ if(err) throw err; res.redirect('/purchase/view'); });
    });
  },
  purchasedelete_admin: (req,res)=>{
    db.query('DELETE FROM purchase WHERE purchase_id=?', [req.params.purchaseId], (err)=>{ if(err) throw err; res.redirect('/purchase/view'); });
  }
};
