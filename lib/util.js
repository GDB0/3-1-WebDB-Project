const db = require('./db');

function authInfo(req) {
  if (req.session && req.session.is_logined) {
    return {
      name: req.session.name,
      login: true,
      cls: req.session.cls,
      loginid: req.session.loginid
    };
  }
  return { name: 'Guest', login: false, cls: 'NON', loginid: '' };
}

function getCategories(callback) {
  const sql = `SELECT main_id, sub_id, main_name, sub_name
               FROM code
               ORDER BY main_id, sub_id, start`;
  db.query(sql, (error, categories) => {
    if (error) return callback(null, []);
    callback(null, categories);
  });
}

function getBoardtypes(callback) {
  const sql = `SELECT * FROM boardtype ORDER BY type_id`;
  db.query(sql, (error, boardtypes) => {
    if (error) return callback(null, []);
    callback(null, boardtypes);
  });
}

function render(req, res, body, extra = {}) {
  const { name, login, cls, loginid } = authInfo(req);

  getCategories((err, categories) => {
    getBoardtypes((err2, boardtypes) => {
      const context = Object.assign({
        who: name,
        login,
        cls,
        loginid,
        body,
        categories,
        boardtypes
      }, extra);

      res.render('mainFrame', context, (error, html) => {
        if (error) throw error;
        res.end(html);
      });
    });
  });
}

module.exports = { authInfo, getCategories, getBoardtypes, render };
