<?php
// api/auth/register.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
// IMPORTANT: Add 'OPTIONS' to the list of allowed methods
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// IMPORTANT: Handle preflight 'OPTIONS' request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

include_once '../../config/database.php';
include_once '../../core/initialize_user.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->name) || !isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data. Please provide name, email, and password."]);
    return;
}
if (strlen($data->password) < 6) {
    http_response_code(400);
    echo json_encode(["message" => "Password must be at least 6 characters long."]);
    return;
}

// --- Start a transaction ---
$db->beginTransaction();

try {
    // Check if email already exists
    $check_query = "SELECT id FROM users WHERE email = :email";
    $check_stmt = $db->prepare($check_query);
    $check_stmt->bindParam(':email', $data->email);
    $check_stmt->execute();

    if ($check_stmt->rowCount() > 0) {
        http_response_code(409); // Conflict
        echo json_encode(["message" => "User with this email already exists."]);
        $db->rollBack(); // Rollback the transaction
        return;
    }

    $query = "INSERT INTO users (name, email, password) VALUES (:name, :email, :password)";
    $stmt = $db->prepare($query);

    $password_hash = password_hash($data->password, PASSWORD_BCRYPT);

    $stmt->bindParam(':name', $data->name);
    $stmt->bindParam(':email', $data->email);
    $stmt->bindParam(':password', $password_hash);

    if ($stmt->execute()) {
        $user_id = $db->lastInsertId();
        
        // Initialize user with default categories and budgets
        initialize_new_user($db, $user_id);
        
        // If everything is successful, commit the transaction
        $db->commit();
        
        http_response_code(201);
        echo json_encode(["message" => "User was successfully registered."]);
    } else {
        // If user creation fails, roll back
        $db->rollBack();
        http_response_code(503);
        echo json_encode(["message" => "Unable to register user."]);
    }
} catch (Exception $e) {
    // If any exception occurs, roll back
    $db->rollBack();
    http_response_code(500);
    echo json_encode(["message" => "An error occurred.", "error" => $e->getMessage()]);
}
?>