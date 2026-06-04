const db = require('./db');
var sanitizeHtml = require('sanitize-html');
var util = require('./util');

module.exports = {
    login : (req, res)=>{
        util.render(req, res, 'login.ejs');
    },

    login_process : (req,res)=>{
        var post = req.body;
        var sntzedLoginid = sanitizeHtml(post.loginid);
        var sntzedPassword = sanitizeHtml(post.password);

        db.query(
            'select count(*) as num from person where loginid = ? and password = ?',
            [sntzedLoginid, sntzedPassword],
            (error, results)=>{
                if(error) throw error;

                if(results[0].num === 1){
                    db.query(
                        'select name, class, loginid from person where loginid = ? and password = ?',
                        [sntzedLoginid, sntzedPassword],
                        (error, result)=>{
                            if(error) throw error;

                            req.session.is_logined = true;
                            req.session.loginid = result[0].loginid;
                            req.session.name = result[0].name;
                            req.session.cls = result[0].class;

                            req.session.save(()=>{
                                res.redirect('/');
                            });
                        }
                    );
                } else {
                    req.session.is_logined = false;
                    req.session.name = 'Guest';
                    req.session.cls = 'NON';

                    req.session.save(()=>{
                        res.redirect('/auth/login');
                    });
                }
            }
        );
    },

    logout_process : (req,res)=>{
        req.session.destroy((err)=>{
            if(err) throw err;
            res.redirect('/');
        });
    }
};
