<?php
// core/initialize_user.php
function initialize_new_user($pdo, $user_id) {
    // Default Categories
    $default_categories = [
      ['name' => 'Food (expense)', 'type' => 'expense', 'iconKey' => 'Food', 'isDefault' => 1],
      ['name' => 'Shopping (expense)', 'type' => 'expense', 'iconKey' => 'Shopping', 'isDefault' => 1],
      ['name' => 'Transportation (expense)', 'type' => 'expense', 'iconKey' => 'Transportation', 'isDefault' => 1],
      ['name' => 'Entertainment (expense)', 'type' => 'expense', 'iconKey' => 'Entertainment', 'isDefault' => 1],
      ['name' => 'Utilities (expense)', 'type' => 'expense', 'iconKey' => 'Utilities', 'isDefault' => 1],
      ['name' => 'Healthcare (expense)', 'type' => 'expense', 'iconKey' => 'Healthcare', 'isDefault' => 1],
      ['name' => 'Investment (expense)', 'type' => 'expense', 'iconKey' => 'Investment', 'isDefault' => 1],
      ['name' => 'Other (expense)', 'type' => 'expense', 'iconKey' => 'Other', 'isDefault' => 1],
      ['name' => 'Salary (income)', 'type' => 'income', 'iconKey' => 'Salary', 'isDefault' => 1],
      ['name' => 'Freelance (income)', 'type' => 'income', 'iconKey' => 'Freelance', 'isDefault' => 1],
      ['name' => 'Investment (income)', 'type' => 'income', 'iconKey' => 'Investment', 'isDefault' => 1],
      ['name' => 'Other (income)', 'type' => 'income', 'iconKey' => 'Other', 'isDefault' => 1],
    ];

    $cat_stmt = $pdo->prepare("INSERT INTO categories (user_id, name, type, iconKey, isDefault) VALUES (:user_id, :name, :type, :iconKey, :isDefault)");
    foreach ($default_categories as $cat) {
        $cat_stmt->execute([
            ':user_id' => $user_id,
            ':name' => $cat['name'],
            ':type' => $cat['type'],
            ':iconKey' => $cat['iconKey'],
            ':isDefault' => $cat['isDefault']
        ]);
    }

    // Default Budgets
    $default_budgets = [
        "Entertainment (expense)" => 750000,
        "Food (expense)" => 2000000,
        "Healthcare (expense)" => 300000,
        "Shopping (expense)" => 1000000,
        "Transportation (expense)" => 500000,
        "Utilities (expense)" => 800000,
        "Other (expense)" => 500000
    ];

    $bud_stmt = $pdo->prepare("INSERT INTO budgets (user_id, category, amount) VALUES (:user_id, :category, :amount)");
    foreach ($default_budgets as $category => $amount) {
        $bud_stmt->execute([
            ':user_id' => $user_id,
            ':category' => $category,
            ':amount' => $amount
        ]);
    }
}
?>