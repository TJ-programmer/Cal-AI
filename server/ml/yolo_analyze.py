import base64
import io
import json
import sys

from PIL import Image
from ultralytics import YOLO


FOOD_DB = {
    "banana": {"calories": 105, "protein": 1.3, "carbs": 27, "fat": 0.4, "fiber": 3.1, "quantity": "1 medium"},
    "apple": {"calories": 95, "protein": 0.5, "carbs": 25, "fat": 0.3, "fiber": 4.4, "quantity": "1 medium"},
    "orange": {"calories": 62, "protein": 1.2, "carbs": 15.4, "fat": 0.2, "fiber": 3.1, "quantity": "1 medium"},
    "pizza": {"calories": 285, "protein": 12, "carbs": 36, "fat": 10, "fiber": 2.5, "quantity": "1 slice"},
    "sandwich": {"calories": 250, "protein": 12, "carbs": 30, "fat": 9, "fiber": 3, "quantity": "1 sandwich"},
    "broccoli": {"calories": 55, "protein": 3.7, "carbs": 11, "fat": 0.6, "fiber": 5, "quantity": "1 cup"},
    "carrot": {"calories": 25, "protein": 0.6, "carbs": 6, "fat": 0.1, "fiber": 1.7, "quantity": "1 medium"},
    "hot dog": {"calories": 151, "protein": 5.2, "carbs": 1.7, "fat": 13, "fiber": 0, "quantity": "1 piece"},
    "donut": {"calories": 195, "protein": 2.1, "carbs": 22, "fat": 11, "fiber": 0.8, "quantity": "1 donut"},
    "cake": {"calories": 257, "protein": 3.2, "carbs": 35, "fat": 11, "fiber": 1, "quantity": "1 slice"},
}


WORKOUT_HINTS = {
    "person": {"calories": 220, "quantity": "30 min session"},
    "bicycle": {"calories": 280, "quantity": "30 min cycling"},
}


def parse_payload():
    raw = sys.stdin.read().strip()
    if not raw:
        raise ValueError("Empty request body")
    return json.loads(raw)


def decode_image(image_data_url):
    if "," not in image_data_url:
        raise ValueError("Invalid imageDataUrl")
    encoded = image_data_url.split(",", 1)[1]
    image_bytes = base64.b64decode(encoded)
    return Image.open(io.BytesIO(image_bytes)).convert("RGB")


def detect_labels(image):
    model = YOLO("yolov8n.pt")
    results = model.predict(source=image, conf=0.25, verbose=False)
    labels = []
    confidences = []
    if not results:
        return labels, confidences
    names = results[0].names
    for box in results[0].boxes:
        cls_id = int(box.cls[0].item())
        conf = float(box.conf[0].item())
        labels.append(names.get(cls_id, str(cls_id)).lower())
        confidences.append(conf)
    return labels, confidences


def meal_estimate(labels):
    calories = 0.0
    protein = 0.0
    carbs = 0.0
    fat = 0.0
    fiber = 0.0
    matched = []
    for label in labels:
        if label in FOOD_DB:
            item = FOOD_DB[label]
            calories += item["calories"]
            protein += item["protein"]
            carbs += item["carbs"]
            fat += item["fat"]
            fiber += item["fiber"]
            matched.append(label)
    if not matched:
        return {
            "itemName": "Meal",
            "quantity": "1 serving",
            "calories": 350,
            "macronutrients": {"protein": 15, "carbs": 35, "fat": 12},
            "micronutrients": {"fiber": 4},
            "notes": "YOLO found no known food class. Applied generic meal estimate."
        }
    return {
        "itemName": ", ".join(sorted(set(matched))),
        "quantity": f"{len(matched)} detected item(s)",
        "calories": round(calories, 1),
        "macronutrients": {
            "protein": round(protein, 1),
            "carbs": round(carbs, 1),
            "fat": round(fat, 1),
        },
        "micronutrients": {
            "fiber": round(fiber, 1),
        },
        "notes": "Estimated from YOLO object classes."
    }


def workout_estimate(labels):
    calories = 180.0
    quantity = "30 min session"
    note = "Estimated from movement context."
    for label in labels:
        if label in WORKOUT_HINTS:
            calories = WORKOUT_HINTS[label]["calories"]
            quantity = WORKOUT_HINTS[label]["quantity"]
            note = f"Estimated from detected class: {label}."
            break
    return {
        "itemName": "Workout",
        "quantity": quantity,
        "calories": calories,
        "macronutrients": {"protein": 0, "carbs": 0, "fat": 0},
        "micronutrients": {"fiber": 0},
        "notes": note
    }


def main():
    payload = parse_payload()
    mode = payload.get("mode", "meal")
    image_data_url = payload.get("imageDataUrl", "")
    image = decode_image(image_data_url)
    labels, confidences = detect_labels(image)

    if mode == "workout":
        result = workout_estimate(labels)
    else:
        result = meal_estimate(labels)

    confidence = max(confidences) if confidences else 0.35
    result["confidence"] = round(min(max(confidence, 0.0), 1.0), 3)
    print(json.dumps(result))


if __name__ == "__main__":
    main()
