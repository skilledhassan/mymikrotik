CREATE DATABASE IF NOT EXISTS `mymikrotik` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'mymikrotik'@'127.0.0.1' IDENTIFIED BY 'Player@1187#db';
CREATE USER IF NOT EXISTS 'mymikrotik'@'localhost' IDENTIFIED BY 'Player@1187#db';

GRANT ALL PRIVILEGES ON `mymikrotik`.* TO 'mymikrotik'@'127.0.0.1';
GRANT ALL PRIVILEGES ON `mymikrotik`.* TO 'mymikrotik'@'localhost';

FLUSH PRIVILEGES;
