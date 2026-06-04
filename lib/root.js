const db = require('./db');
const util = require('./util');

function productListSql(where) {
  return `SELECT p.*, c.main_name, c.sub_name
          FROM product p
          LEFT JOIN code c ON p.main_id = c.main_id AND p.sub_id = c.sub_id
          ${where || ''}
          ORDER BY p.prod_id DESC`;
}

module.exports = {
  home: (req, res) => {
    db.query(productListSql(''), (error, products) => {
      if (error) throw error;
      util.render(req, res, 'product.ejs', { products, isHome: true });
    });
  },

  category: (req, res) => {
    db.query(productListSql('WHERE p.main_id = ? AND p.sub_id = ?'), [req.params.main, req.params.sub], (error, products) => {
      if (error) throw error;
      util.render(req, res, 'product.ejs', { products, isHome: true });
    });
  },

  search: (req, res) => {
    const keyword = `%${req.body.search || ''}%`;
    const where = 'WHERE p.name LIKE ? OR p.brand LIKE ? OR p.supplier LIKE ?';
    db.query(productListSql(where), [keyword, keyword, keyword], (error, products) => {
      if (error) throw error;
      util.render(req, res, 'product.ejs', { products, isHome: true });
    });
  },

  detail: (req, res) => {
    db.query('SELECT * FROM product WHERE prod_id=?', [req.params.prodId], (error, products) => {
      if (error) throw error;
      if (products.length === 0) return res.redirect('/');
      util.render(req, res, 'productDetail.ejs', { product: products[0] });
    });
  }
};
