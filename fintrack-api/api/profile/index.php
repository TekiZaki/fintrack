<?php
// api/profile/index.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require "../../vendor/autoload.php";
use Firebase\JWT\JWT;
use Firebase\JWT\Key; // <-- Ensure Key is imported

include_once '../../config/database.php';

$secret_key = "YOUR_SECRET_KEY";
$database = new Database();
$db = $database->getConnection();

// --- Authentication ---
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? null;
$jwt = null;
if ($authHeader) {
    list(, $jwt) = explode(' ', $authHeader);
}

if (!$jwt) {
    http_response_code(401);
    echo json_encode(["message" => "Access denied. No token provided."]);
    exit();
}

try {
    // CRUCIAL FIX: Use the 'new Key()' object for decoding.
    $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
    $user_id = $decoded->data->id;
    $current_email = $decoded->data->email;
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Access denied.", "error" => $e->getMessage()]);
    exit();
}
// --- End Authentication ---

// The rest of the file remains the same.
$data = json_decode(file_get_contents("php://input"));

if (!isset($data->name) || !isset($data->email)) {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data."]);
    return;
}

try {
    if ($data->email !== $current_email) {
        $check_stmt = $db->prepare("SELECT id FROM users WHERE email = :email");
        $check_stmt->execute([':email' => $data->email]);
        if ($check_stmt->rowCount() > 0) {
            http_response_code(409);
            echo json_encode(["message" => "Email is already taken by another account."]);
            return;
        }
    }

    $query = "UPDATE users SET name = :name, email = :email";
    $params = [
        ':name' => $data->name,
        ':email' => $data->email,
        ':id' => $user_id
    ];
    
    if (isset($data->avatar)) {
        $query .= ", avatar = :avatar";
        $params[':avatar'] = $data->avatar;
    }

    $query .= " WHERE id = :id";
    
    $stmt = $db->prepare($query);

    if($stmt->execute($params)) {
        http_response_code(200);
        echo json_encode(["message" => "Profile updated successfully."]);
    } else {
        http_response_code(503);
        echo json_encode(["message" => "Unable to update profile."]);
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "An error occurred.", "error" => $e->getMessage()]);
}
?>