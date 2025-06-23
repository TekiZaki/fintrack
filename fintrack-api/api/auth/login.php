<?php
// api/auth/login.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require "../../vendor/autoload.php";
use Firebase\JWT\JWT;

include_once '../../config/database.php';

$database = new Database();
$db = $database->getConnection();

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->email) || !isset($data->password)) {
    http_response_code(400);
    echo json_encode(["message" => "Incomplete data."]);
    return;
}

$query = "SELECT id, name, email, password, avatar FROM users WHERE email = :email LIMIT 0,1";
$stmt = $db->prepare($query);
$stmt->bindParam(':email', $data->email);
$stmt->execute();

$num = $stmt->rowCount();

if ($num > 0) {
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    $id = $row['id'];
    $name = $row['name'];
    $email = $row['email'];
    $password2 = $row['password'];
    $avatar = $row['avatar'];

    if (password_verify($data->password, $password2)) {
        $secret_key = "YOUR_SECRET_KEY";
        $issuer_claim = "http://yourdomain.com"; 
        $audience_claim = "THE_AUDIENCE";
        $issuedat_claim = time();
        $notbefore_claim = $issuedat_claim;
        $expire_claim = $issuedat_claim + 3600; // Token expires in 1 hour

        $token_payload = array(
            "iss" => $issuer_claim,
            "aud" => $audience_claim,
            "iat" => $issuedat_claim,
            "nbf" => $notbefore_claim,
            "exp" => $expire_claim,
            "data" => array(
                "id" => $id,
                "name" => $name,
                "email" => $email
            )
        );

        http_response_code(200);
        $jwt = JWT::encode($token_payload, $secret_key, 'HS256');
        
        echo json_encode(
            array(
                "message" => "Successful login.",
                "token" => $jwt,
                "expiresIn" => $expire_claim,
                "user" => array(
                    "name" => $name,
                    "email" => $email,
                    "avatar" => $avatar
                )
            )
        );
    } else {
        http_response_code(401);
        echo json_encode(array("message" => "Login failed. Invalid credentials."));
    }
} else {
    http_response_code(401);
    echo json_encode(array("message" => "Login failed. User not found."));
}
?>