const db = require('./db');
const sanitizeHtml = require('sanitize-html');
const util = require('./util');

function clean(value) {
  return sanitizeHtml(String(value ?? ''));
}

function today() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}.${m}.${day}`;
}

function alertBack(res, message, url) {
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <script>
      alert('${message}');
      location.href='${url}';
    </script>
  `);
}

module.exports = {
  typeview: (req, res) => {
    db.query('SELECT * FROM boardtype ORDER BY type_id', (error, boardtypes) => {
      if (error) throw error;
      util.render(req, res, 'boardtype.ejs', { boardtypes });
    });
  },

  typecreate: (req, res) => {
    util.render(req, res, 'boardtypeCU.ejs', {
      mode: 'create',
      boardtype: {
        type_id: '',
        title: '',
        description: '',
        write_YN: 'N',
        re_YN: 'N',
        numPerPage: 2
      }
    });
  },

  typecreate_process: (req, res) => {
    const post = req.body;
    db.query(
      `INSERT INTO boardtype(title, description, write_YN, re_YN, numPerPage)
       VALUES(?, ?, ?, ?, ?)`,
      [
        clean(post.title),
        clean(post.description),
        clean(post.write_YN || 'N'),
        clean(post.re_YN || 'N'),
        Number(post.numPerPage || 2)
      ],
      (error) => {
        if (error) throw error;
        res.redirect('/board/type/view');
      }
    );
  },

  typeupdate: (req, res) => {
    const typeId = clean(req.params.typeId);
    db.query('SELECT * FROM boardtype WHERE type_id = ?', [typeId], (error, result) => {
      if (error) throw error;
      if (result.length === 0) return res.redirect('/board/type/view');

      util.render(req, res, 'boardtypeCU.ejs', {
        mode: 'update',
        boardtype: result[0]
      });
    });
  },

  typeupdate_process: (req, res) => {
    const post = req.body;
    db.query(
      `UPDATE boardtype
       SET title = ?, description = ?, write_YN = ?, re_YN = ?, numPerPage = ?
       WHERE type_id = ?`,
      [
        clean(post.title),
        clean(post.description),
        clean(post.write_YN || 'N'),
        clean(post.re_YN || 'N'),
        Number(post.numPerPage || 2),
        clean(post.type_id)
      ],
      (error) => {
        if (error) throw error;
        res.redirect('/board/type/view');
      }
    );
  },

  typedelete_process: (req, res) => {
    const typeId = clean(req.params.typeId);
    db.query('DELETE FROM boardtype WHERE type_id = ?', [typeId], (error) => {
      if (error) {
        return alertBack(res, '해당 게시판에 글이 남아 있어 삭제할 수 없습니다.', '/board/type/view');
      }
      res.redirect('/board/type/view');
    });
  },

  view: (req, res) => {
    const auth = util.authInfo(req);
    const typeId = clean(req.params.typeId);
    const pNum = Number(req.params.pNum || 1);

    db.query('SELECT * FROM boardtype WHERE type_id = ?', [typeId], (error1, btname) => {
      if (error1) throw error1;
      if (btname.length === 0) return res.redirect('/board/type/view');

      const numPerPage = Number(btname[0].numPerPage || 2);

      db.query(
        'SELECT COUNT(*) AS total FROM board WHERE type_id = ? AND p_id = 0',
        [typeId],
        (error2, countResult) => {
          if (error2) throw error2;

          const total = countResult[0].total;
          const totalPages = Math.max(1, Math.ceil(total / numPerPage));
          const currentPage = Math.min(Math.max(pNum, 1), totalPages);
          const offs = (currentPage - 1) * numPerPage;

          db.query(
            `SELECT b.board_id, b.type_id, b.p_id, b.loginid, b.title, b.date, p.name
             FROM board b
             LEFT JOIN person p ON b.loginid = p.loginid
             WHERE b.type_id = ? AND b.p_id = 0
             ORDER BY b.board_id DESC
             LIMIT ? OFFSET ?`,
            [typeId, numPerPage, offs],
            (error3, parents) => {
              if (error3) throw error3;

              if (parents.length === 0) {
                return util.render(req, res, 'board.ejs', {
                  btname,
                  boards: [],
                  totalPages,
                  pNum: currentPage,
                  cls: auth.cls,
                  loginid: auth.loginid
                });
              }

              const parentIds = parents.map(b => b.board_id);
              db.query(
                `SELECT b.board_id, b.type_id, b.p_id, b.loginid, b.title, b.date, p.name
                 FROM board b
                 LEFT JOIN person p ON b.loginid = p.loginid
                 WHERE b.type_id = ? AND b.p_id IN (?)
                 ORDER BY b.board_id ASC`,
                [typeId, parentIds],
                (error4, replies) => {
                  if (error4) throw error4;

                  const boards = [];
                  parents.forEach(parent => {
                    boards.push(parent);
                    replies.filter(reply => reply.p_id === parent.board_id).forEach(reply => boards.push(reply));
                  });

                  util.render(req, res, 'board.ejs', {
                    btname,
                    boards,
                    totalPages,
                    pNum: currentPage,
                    cls: auth.cls,
                    loginid: auth.loginid
                  });
                }
              );
            }
          );
        }
      );
    });
  },

  create: (req, res) => {
    const auth = util.authInfo(req);
    const typeId = clean(req.params.typeId);

    db.query('SELECT * FROM boardtype WHERE type_id = ?', [typeId], (error, btname) => {
      if (error) throw error;
      if (btname.length === 0) return res.redirect('/board/type/view');

      const canWrite = auth.cls === 'MNG' || (auth.cls === 'CST' && btname[0].write_YN === 'Y');
      if (!canWrite) {
        return alertBack(res, '글쓰기 권한이 없습니다.', `/board/view/${typeId}/1`);
      }

      util.render(req, res, 'boardCRU.ejs', {
        mode: 'create',
        btname,
        board: {
          board_id: '',
          type_id: typeId,
          p_id: 0,
          loginid: auth.loginid,
          title: '',
          content: '',
          password: ''
        },
        pNum: 1
      });
    });
  },

  create_process: (req, res) => {
    const auth = util.authInfo(req);
    const post = req.body;
    const typeId = clean(post.type_id);

    db.query(
      `INSERT INTO board(type_id, p_id, loginid, password, title, date, content)
       VALUES(?, ?, ?, ?, ?, ?, ?)`,
      [
        typeId,
        Number(post.p_id || 0),
        clean(auth.loginid || post.loginid),
        clean(post.password),
        clean(post.title),
        today(),
        clean(post.content)
      ],
      (error) => {
        if (error) throw error;
        res.redirect(`/board/view/${typeId}/1`);
      }
    );
  },

  detail: (req, res) => {
    const boardId = clean(req.params.boardId);
    const pNum = Number(req.params.pNum || 1);

    db.query(
      `SELECT b.*, p.name
       FROM board b
       LEFT JOIN person p ON b.loginid = p.loginid
       WHERE b.board_id = ?`,
      [boardId],
      (error, result) => {
        if (error) throw error;
        if (result.length === 0) return res.redirect('/');

        db.query('SELECT * FROM boardtype WHERE type_id = ?', [result[0].type_id], (error2, btname) => {
          if (error2) throw error2;

          db.query('SELECT COUNT(*) AS cnt FROM board WHERE p_id = ?', [boardId], (error3, replyCount) => {
            if (error3) throw error3;

            util.render(req, res, 'boardCRU.ejs', {
              mode: 'detail',
              btname,
              board: result[0],
              pNum,
              hasReply: replyCount[0].cnt > 0
            });
          });
        });
      }
    );
  },

  update: (req, res) => {
    const auth = util.authInfo(req);
    const boardId = clean(req.params.boardId);
    const typeId = clean(req.params.typeId);
    const pNum = Number(req.params.pNum || 1);

    db.query(
      `SELECT b.*, p.name
       FROM board b
       LEFT JOIN person p ON b.loginid = p.loginid
       WHERE b.board_id = ?`,
      [boardId],
      (error, result) => {
        if (error) throw error;
        if (result.length === 0) return res.redirect(`/board/view/${typeId}/${pNum}`);

        const board = result[0];
        const canUpdate = auth.cls === 'MNG' || (auth.cls === 'CST' && auth.loginid === board.loginid);
        if (!canUpdate) {
          return alertBack(res, '수정 권한이 없습니다.', `/board/detail/${boardId}/${pNum}`);
        }

        db.query('SELECT * FROM boardtype WHERE type_id = ?', [typeId], (error2, btname) => {
          if (error2) throw error2;

          util.render(req, res, 'boardCRU.ejs', {
            mode: 'update',
            btname,
            board,
            pNum
          });
        });
      }
    );
  },

  update_process: (req, res) => {
    const auth = util.authInfo(req);
    const post = req.body;
    const boardId = clean(post.board_id);
    const typeId = clean(post.type_id);
    const pNum = Number(post.pNum || 1);

    db.query('SELECT * FROM board WHERE board_id = ?', [boardId], (error, result) => {
      if (error) throw error;
      if (result.length === 0) return res.redirect(`/board/view/${typeId}/${pNum}`);

      const board = result[0];
      const canUpdate = auth.cls === 'MNG' || (auth.cls === 'CST' && auth.loginid === board.loginid);
      if (!canUpdate) {
        return alertBack(res, '수정 권한이 없습니다.', `/board/detail/${boardId}/${pNum}`);
      }

      if (auth.cls !== 'MNG' && clean(post.password) !== String(board.password || '')) {
        return alertBack(res, '비밀번호가 일치하지 않습니다.', `/board/update/${boardId}/${typeId}/${pNum}`);
      }

      db.query(
        `UPDATE board
         SET title = ?, content = ?, password = ?
         WHERE board_id = ?`,
        [clean(post.title), clean(post.content), clean(post.password), boardId],
        (error2) => {
          if (error2) throw error2;
          res.redirect(`/board/detail/${boardId}/${pNum}`);
        }
      );
    });
  },

  reply: (req, res) => {
    const auth = util.authInfo(req);
    const boardId = clean(req.params.boardId);
    const pNum = Number(req.params.pNum || 1);

    if (auth.cls !== 'MNG') {
      return alertBack(res, '관리자만 답변을 작성할 수 있습니다.', `/board/detail/${boardId}/${pNum}`);
    }

    db.query(
      `SELECT b.*, p.name
       FROM board b
       LEFT JOIN person p ON b.loginid = p.loginid
       WHERE b.board_id = ?`,
      [boardId],
      (error, result) => {
        if (error) throw error;
        if (result.length === 0) return res.redirect('/');

        const original = result[0];
        db.query('SELECT * FROM boardtype WHERE type_id = ?', [original.type_id], (error2, btname) => {
          if (error2) throw error2;
          if (btname.length === 0 || btname[0].re_YN !== 'Y' || original.p_id !== 0) {
            return alertBack(res, '답변을 작성할 수 없는 게시글입니다.', `/board/detail/${boardId}/${pNum}`);
          }

          db.query('SELECT COUNT(*) AS cnt FROM board WHERE p_id = ?', [boardId], (error3, countResult) => {
            if (error3) throw error3;
            if (countResult[0].cnt > 0) {
              return alertBack(res, '이미 답변이 작성된 글입니다.', `/board/detail/${boardId}/${pNum}`);
            }

            util.render(req, res, 'boardCRU.ejs', {
              mode: 'reply',
              btname,
              board: {
                board_id: '',
                type_id: original.type_id,
                p_id: original.board_id,
                loginid: auth.loginid,
                title: `[답변] : ${original.title}`,
                content: '',
                password: '',
                original_title: original.title,
                original_writer: original.name || original.loginid,
                original_date: original.date,
                original_content: original.content
              },
              pNum
            });
          });
        });
      }
    );
  },

  reply_process: (req, res) => {
    const auth = util.authInfo(req);
    const post = req.body;
    const typeId = clean(post.type_id);
    const parentId = clean(post.p_id);
    const pNum = Number(post.pNum || 1);

    if (auth.cls !== 'MNG') {
      return alertBack(res, '관리자만 답변을 작성할 수 있습니다.', `/board/detail/${parentId}/${pNum}`);
    }

    db.query('SELECT COUNT(*) AS cnt FROM board WHERE p_id = ?', [parentId], (error, countResult) => {
      if (error) throw error;
      if (countResult[0].cnt > 0) {
        return alertBack(res, '이미 답변이 작성된 글입니다.', `/board/detail/${parentId}/${pNum}`);
      }

      db.query(
        `INSERT INTO board(type_id, p_id, loginid, password, title, date, content)
         VALUES(?, ?, ?, ?, ?, ?, ?)`,
        [
          typeId,
          parentId,
          clean(auth.loginid),
          '',
          clean(post.title),
          today(),
          clean(post.content)
        ],
        (error2) => {
          if (error2) throw error2;
          res.redirect(`/board/view/${typeId}/${pNum}`);
        }
      );
    });
  },

  delete_process: (req, res) => {
    const auth = util.authInfo(req);
    const boardId = clean(req.params.boardId);
    const typeId = clean(req.params.typeId);
    const pNum = Number(req.params.pNum || 1);

    db.query('SELECT * FROM board WHERE board_id = ?', [boardId], (error, result) => {
      if (error) throw error;
      if (result.length === 0) return res.redirect(`/board/view/${typeId}/${pNum}`);

      const board = result[0];
      const canDelete = auth.cls === 'MNG' || (auth.cls === 'CST' && auth.loginid === board.loginid);
      if (!canDelete) {
        return alertBack(res, '삭제 권한이 없습니다.', `/board/detail/${boardId}/${pNum}`);
      }

      db.query('DELETE FROM board WHERE board_id = ?', [boardId], (error2) => {
        if (error2) throw error2;
        res.redirect(`/board/view/${typeId}/${pNum}`);
      });
    });
  }
};
