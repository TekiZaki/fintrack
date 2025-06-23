<?php
// api/data/sync.php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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
if (!$authHeader) {
    http_response_code(401);
    echo json_encode(["message" => "Access denied. Authorization header is missing."]);
    exit();
}

$arr = explode(" ", $authHeader);
$jwt = $arr[1] ?? null;

if (!$jwt) {
    http_response_code(401);
    echo json_encode(["message" => "Access denied. Token not found."]);
    exit();
}

try {
    // CRUCIAL FIX: Use the 'new Key()' object for decoding.
    $decoded = JWT::decode($jwt, new Key($secret_key, 'HS256'));
    $user_id = $decoded->data->id;
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode(["message" => "Access denied. Invalid token.", "error" => $e->getMessage()]);
    exit();
}
// --- End Authentication ---

$method = $_SERVER['REQUEST_METHOD'];

if ($method == 'GET') {
    try {
        $response = [];
        $stmt = $db->prepare("SELECT id, name, email, avatar FROM users WHERE id = :id");
        $stmt->execute([':id' => $user_id]);
        $response['profile'] = $stmt->fetch(PDO::FETCH_ASSOC);
        $stmt = $db->prepare("SELECT name, type, iconKey, isDefault FROM categories WHERE user_id = :id");
        $stmt->execute([':id' => $user_id]);
        $response['categories'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt = $db->prepare("SELECT client_id as id, description, amount, type, category, date FROM transactions WHERE user_id = :id");
        $stmt->execute([':id' => $user_id]);
        $response['transactions'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $stmt = $db->prepare("SELECT category, amount FROM budgets WHERE user_id = :id");
        $stmt->execute([':id' => $user_id]);
        $budgets_raw = $stmt->fetchAll(PDO::FETCH_ASSOC);
        $budgets_formatted = [];
        foreach($budgets_raw as $b) {
            $budgets_formatted[$b['category']] = (float)$b['amount'];
        }
        $response['budgets'] = $budgets_formatted;
        $stmt = $db->prepare("SELECT client_id as id, name, targetAmount, currentAmount, targetDate FROM goals WHERE user_id = :id");
        $stmt->execute([':id' => $user_id]);
        $response['goals'] = $stmt->fetchAll(PDO::FETCH_ASSOC);
        http_response_code(200);
        echo json_encode($response);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode(["message" => "Error fetching data.", "error" => $e->getMessage()]);
    }
} elseif ($method == 'POST') {
    $data = json_decode(file_get_contents("php://input"), true);

    try {
        $db->beginTransaction();

        // --- NEW: HANDLE PROFILE SYNC (Name and Avatar only) ---
        if (isset($data['profile'])) {
            $profile = $data['profile'];
            $update_fields = [];
            $params = [':user_id' => $user_id];
            
            // Sync 'name' if present
            if (isset($profile['name'])) {
                $update_fields[] = "name = :name";
                $params[':name'] = $profile['name'];
            }

            // Sync 'avatar' if present (including if it's null)
            if (array_key_exists('avatar', $profile)) {
                $update_fields[] = "avatar = :avatar";
                $params[':avatar'] = $profile['avatar'];
            }

            if (!empty($update_fields)) {
                $sql = "UPDATE users SET " . implode(', ', $update_fields) . " WHERE id = :user_id";
                $stmt = $db->prepare($sql);
                $stmt->execute($params);
            }
        }
        // --- END OF NEW CODE ---


        if(isset($data['transactions'])) {
            $stmt = $db->prepare("INSERT INTO transactions (user_id, client_id, description, amount, type, category, date) VALUES (:user_id, :client_id, :description, :amount, :type, :category, :date) ON DUPLICATE KEY UPDATE description=VALUES(description), amount=VALUES(amount), type=VALUES(type), category=VALUES(category), date=VALUES(date)");
            foreach($data['transactions'] as $tx) {
                $stmt->execute([':user_id' => $user_id, ':client_id' => $tx['id'], ':description' => $tx['description'], ':amount' => $tx['amount'], ':type' => $tx['type'], ':category' => $tx['category'], ':date' => $tx['date']]);
            }
        }

        if(isset($data['categories'])) {
            $stmt = $db->prepare("INSERT INTO categories (user_id, name, type, iconKey, isDefault) VALUES (:user_id, :name, :type, :iconKey, 0) ON DUPLICATE KEY UPDATE name=name");
            foreach($data['categories'] as $cat) {
                // Only insert or update non-default categories via sync
                if (!$cat['isDefault']) {
                    $stmt->execute([':user_id' => $user_id, ':name' => $cat['name'], ':type' => $cat['type'], ':iconKey' => $cat['iconKey'] ?? 'Other']);
                }
            }
        }

        if(isset($data['budgets'])) {
            // Delete all existing budgets for the user and re-insert
            $del_stmt = $db->prepare("DELETE FROM budgets WHERE user_id = :user_id");
            $del_stmt->execute([':user_id' => $user_id]);
            $ins_stmt = $db->prepare("INSERT INTO budgets (user_id, category, amount) VALUES (:user_id, :category, :amount)");
            foreach($data['budgets'] as $category => $amount) {
                $ins_stmt->execute([':user_id' => $user_id, ':category' => $category, ':amount' => $amount]);
            }
        }

        if(isset($data['goals'])) {
             $stmt = $db->prepare("INSERT INTO goals (user_id, client_id, name, targetAmount, currentAmount, targetDate) VALUES (:user_id, :client_id, :name, :targetAmount, :currentAmount, :targetDate) ON DUPLICATE KEY UPDATE name=VALUES(name), targetAmount=VALUES(targetAmount), currentAmount=VALUES(currentAmount), targetDate=VALUES(targetDate)");
            foreach($data['goals'] as $goal) {
                $stmt->execute([':user_id' => $user_id, ':client_id' => $goal['id'], ':name' => $goal['name'], ':targetAmount' => $goal['targetAmount'], ':currentAmount' => $goal['currentAmount'], ':targetDate' => empty($goal['targetDate']) ? null : $goal['targetDate']]);
            }
        }

        $db->commit();
        http_response_code(200);
        echo json_encode(["message" => "Sync successful."]);

    } catch(Exception $e) {
        $db->rollBack();
        http_response_code(500);
        echo json_encode(["message" => "Sync failed.", "error" => $e->getMessage()]);
    }
}
?>