const db = require('./db');
const sanitizeHtml = require('sanitize-html');
const util = require('./util');

function splitCategory(category) {
  const arr = (category || '').split(':');
  return { main_id: arr[0] || '', sub_id: arr[1] || '' };
}

function productSql() {
  return `SELECT p.*, c.main_name, c.sub_name
          FROM product p
          LEFT JOIN code c ON p.main_id = c.main_id AND p.sub_id = c.sub_id
          ORDER BY p.prod_id DESC`;
}

module.exports = {
  view: (req, res) => {
    db.query(productSql(), (error, products) => {
      if (error) throw error;
      util.render(req, res, 'product.ejs', { products, isHome: false });
    });
  },

  create: (req, res) => {
    util.getCategories((err, codes) => {
      util.render(req, res, 'productCU.ejs', { mode: 'create', product: {}, codes });
    });
  },

  create_process: (req, res) => {
    const p = req.body;
    const cat = splitCategory(p.category);
    const imageName = req.file ? req.file.filename : sanitizeHtml(p.image || '');
    const sql = `INSERT INTO product(main_id, sub_id, name, price, stock, brand, supplier, image)
                 VALUES(?, ?, ?, ?, ?, ?, ?, ?)`;
    const values = [cat.main_id, cat.sub_id, p.name, p.price, p.stock, p.brand, p.supplier, imageName]
      .map(v => sanitizeHtml(String(v || '')));
    db.query(sql, values, (error) => {
      if (error) throw error;
      res.redirect('/product/view');
    });
  },

  update: (req, res) => {
    db.query('SELECT * FROM product WHERE prod_id=?', [req.params.prodId], (error, result) => {
      if (error) throw error;
      if (result.length === 0) return res.redirect('/product/view');
      util.getCategories((err, codes) => {
        util.render(req, res, 'productCU.ejs', { mode: 'update', product: result[0], codes });
      });
    });
  },

  update_process: (req, res) => {
    const p = req.body;
    const cat = splitCategory(p.category);
    const imageName = req.file ? req.file.filename : sanitizeHtml(p.oldImage || p.image || '');
    const sql = `UPDATE product
                 SET main_id=?, sub_id=?, name=?, price=?, stock=?, brand=?, supplier=?, image=?
                 WHERE prod_id=?`;
    const values = [cat.main_id, cat.sub_id, p.name, p.price, p.stock, p.brand, p.supplier, imageName, p.prod_id]
      .map(v => sanitizeHtml(String(v || '')));
    db.query(sql, values, (error) => {
      if (error) throw error;
      res.redirect('/product/view');
    });
  },

  delete_process: (req, res) => {
    db.query('DELETE FROM product WHERE prod_id=?', [req.params.prodId], (error) => {
      if (error) throw error;
      res.redirect('/product/view');
    });
  }
};
