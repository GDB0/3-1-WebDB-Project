CREATE TABLE IF NOT EXISTS purchase (
  purchase_id int NOT NULL AUTO_INCREMENT,
  loginid varchar(10) NOT NULL,
  prod_id int NOT NULL,
  date varchar(30) NOT NULL,
  price int,
  point int,
  qty int,
  total int,
  payYN varchar(1) NOT NULL DEFAULT 'N',
  cancel varchar(1) NOT NULL DEFAULT 'N',
  refund varchar(1) NOT NULL DEFAULT 'N',
  PRIMARY KEY (purchase_id),
  KEY loginid (loginid),
  KEY prod_id (prod_id)
);

CREATE TABLE IF NOT EXISTS cart (
  cart_id int NOT NULL AUTO_INCREMENT,
  loginid varchar(10) NOT NULL,
  prod_id int NOT NULL,
  date varchar(30) NOT NULL,
  qty int DEFAULT 1,
  PRIMARY KEY (cart_id),
  KEY loginid (loginid),
  KEY prod_id (prod_id)
);

-- 고객2 계정이 필요하면 사용
INSERT INTO person(loginid, password, name, address, tel, birth, class)
SELECT 'V', 'V', '고객2', '', '', '', 'CST'
WHERE NOT EXISTS (SELECT 1 FROM person WHERE loginid='V');

-- 이미 cart 테이블을 만든 뒤라면 아래 문장을 한 번 실행하세요.
-- ALTER TABLE cart ADD COLUMN qty int DEFAULT 1;

ALTER TABLE purchase ADD COLUMN refund varchar(1) NOT NULL DEFAULT 'N';
