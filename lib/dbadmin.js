const db = require('./db');
const util = require('./util');

module.exports = {
  tableManage: (req, res) => {
    const sql = `SELECT TABLE_NAME, TABLE_COMMENT
                 FROM INFORMATION_SCHEMA.TABLES
                 WHERE TABLE_SCHEMA = 'webdb2026'
                 ORDER BY TABLE_NAME`;

    db.query(sql, (error, tables) => {
      if (error) throw error;
      util.render(req, res, 'tableManage.ejs', { tables });
    });
  },

  tableView: (req, res) => {
    const tableName = req.params.tableName;

    const columnSql = `SELECT COLUMN_NAME, COLUMN_COMMENT, COLUMN_KEY
                       FROM INFORMATION_SCHEMA.COLUMNS
                       WHERE TABLE_SCHEMA = 'webdb2026'
                       AND TABLE_NAME = ?
                       ORDER BY ORDINAL_POSITION`;

    db.query(columnSql, [tableName], (error1, columns) => {
      if (error1) throw error1;
      if (columns.length === 0) {
        return res.redirect('/dbadmin/tableManage');
      }

      const safeTableName = tableName.replace(/`/g, '');
      const rowSql = `SELECT * FROM \`${safeTableName}\``;

      db.query(rowSql, (error2, rows) => {
        if (error2) throw error2;
        util.render(req, res, 'tableView.ejs', {
          tableName: tableName,
          columns: columns,
          rows: rows
        });
      });
    });
  },

  customeranal: (req, res) => {
    const sql = `SELECT address,
                        ROUND((COUNT(*) / (SELECT COUNT(*) FROM person)) * 100, 2) AS rate
                 FROM person
                 GROUP BY address`;

    db.query(sql, (error, percentage) => {
      if (error) throw error;
      util.render(req, res, 'customeranal.ejs', { percentage });
    });
  }
};
