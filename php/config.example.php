<?php
// Скопируйте на сервер уровнем ВЫШЕ папки сайта как config.php (рядом с public_html), в репозиторий не кладите.
// Хеш пароля: php -r 'echo password_hash("новый-пароль", PASSWORD_DEFAULT), "\n";'
return [
    'db_path' => __DIR__ . '/data/proorgazm.db',
    'admin_user' => 'admin',
    'admin_pass_hash' => '$2y$10$...',
];
