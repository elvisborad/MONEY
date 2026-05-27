import os
import io
import base64
import numpy as np
import cv2
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import database helpers
import database

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for the frontend development server
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize Database
database.init_db()

# Helper function to get Roboflow Client
def get_roboflow_client():
    # 1. Check database setting first
    api_key = database.get_setting('api_key')
    
    # 2. Fallback to environment variable
    if not api_key:
        api_key = os.getenv('ROBOFLOW_API_KEY')
        
    if not api_key or api_key == "YOUR_API_KEY":
        raise ValueError("Roboflow API Key not configured. Please go to Settings to add it.")
        
    # Get region setting
    region = database.get_setting('region', 'us')
    api_url = "https://detect.roboflow.com"
    if region == "serverless":
        api_url = "https://serverless.roboflow.com"
        
    from inference_sdk import InferenceHTTPClient
    client = InferenceHTTPClient(
        api_url=api_url,
        api_key=api_key
    )
    return client

def map_class_name(name):
    # Map label to currency format (10 -> ₹10, etc.)
    clean_name = str(name).strip().replace("₹", "").replace("Rs", "").replace("rs", "")
    valid_denominations = ['10', '20', '50', '100', '200', '500', '2000']
    if clean_name in valid_denominations:
        return f"₹{clean_name}"
    return f"₹{clean_name}"

def process_roboflow_result(result, threshold=0.0, numpy_image=None, counterfeit_check=None):
    predictions = result.get('predictions', [])
    
    # We can handle format if it's nested or different
    if isinstance(predictions, dict) and 'predictions' in predictions:
        predictions = predictions['predictions']
        
    # Compile counts
    counts = {
        "₹10": 0,
        "₹20": 0,
        "₹50": 0,
        "₹100": 0,
        "₹200": 0,
        "₹500": 0,
        "₹2000": 0
    }
    
    formatted_predictions = []
    
    for pred in predictions:
        # Standard Roboflow object detection keys: 'x', 'y', 'width', 'height', 'class', 'confidence'
        class_name = pred.get('class')
        confidence = pred.get('confidence', 0.0)
        
        # Filter predictions below the user's defined confidence threshold
        if confidence < threshold:
            continue
            
        mapped_label = map_class_name(class_name)
        if mapped_label in counts:
            counts[mapped_label] += 1
            
        # Banknote Authenticity Checks (Color profile and Aspect Ratio analysis)
        x = pred.get('x', 0)
        y = pred.get('y', 0)
        w = pred.get('width', 0)
        h = pred.get('height', 0)
        
        authenticity_status = "genuine"
        flag_reason = ""
        
        if counterfeit_check is not None:
            counterfeit_check_enabled = (counterfeit_check is True or counterfeit_check == "1" or str(counterfeit_check).lower() == "true")
        else:
            counterfeit_check_enabled = database.get_setting('counterfeit_check_enabled', '1') == '1'
            
        if counterfeit_check_enabled:
            # Aspect Ratio check (rupee notes standard aspect ratio length/width is ~2.27)
            if w > 0 and h > 0:
                aspect_ratio = max(w, h) / min(w, h)
                if aspect_ratio < 1.4 or aspect_ratio > 3.2:
                    authenticity_status = "suspicious"
                    flag_reason = f"Aspect ratio anomaly ({aspect_ratio:.2f} vs standard ~2.27)"
                    
            # Color profile HSV & OCR text checks
            if numpy_image is not None and w > 10 and h > 10:
                try:
                    img_h, img_w = numpy_image.shape[:2]
                    x1 = max(0, int(x - w / 2))
                    y1 = max(0, int(y - h / 2))
                    x2 = min(img_w, int(x + w / 2))
                    y2 = min(img_h, int(y + h / 2))
                    
                    if (x2 - x1) > 10 and (y2 - y1) > 10:
                        crop = numpy_image[y1:y2, x1:x2]
                        
                        # 1. OCR Banknote Text Verification (Detect Children/Toy notes)
                        # Only run if crop is large enough for text to be legible (w > 80 and h > 40)
                        if (x2 - x1) > 80 and (y2 - y1) > 40:
                            try:
                                from rapidocr_onnxruntime import RapidOCR
                                if not hasattr(process_roboflow_result, "_ocr_engine"):
                                    process_roboflow_result._ocr_engine = RapidOCR()
                                
                                ocr_res, elapse = process_roboflow_result._ocr_engine(crop)
                                if ocr_res:
                                    detected_text = " ".join([line[1] for line in ocr_res]).lower()
                                    fake_terms = [
                                        "children", "childern", "bachhon", "bachon", "manoranjan", 
                                        "मनोरंजन", "churan", "play money", "specimen", "toy", "movie prop",
                                        "prop note", "project school", "dummy", "copy", "manoranjan bank"
                                    ]
                                    for term in fake_terms:
                                        if term in detected_text:
                                            authenticity_status = "counterfeit"
                                            flag_reason = f"Toy/Play banknote text detected: '{term.upper()}'"
                                            break
                                    
                                    if authenticity_status == "genuine" and "000000" in detected_text:
                                        authenticity_status = "counterfeit"
                                        flag_reason = "Dummy serial number detected: '000000'"
                            except Exception as ocr_err:
                                pass
                        
                        # 2. Color Profile Verification (if not already marked as counterfeit)
                        if authenticity_status == "genuine":
                            hsv = cv2.cvtColor(crop, cv2.COLOR_BGR2HSV)
                            mean_hsv = cv2.mean(hsv)
                            h_val = mean_hsv[0] # Hue (0 to 180)
                            s_val = mean_hsv[1] # Saturation (0 to 255)
                            v_val = mean_hsv[2] # Value/Brightness (0 to 255)
                            
                            # Run color range checks only in decent lighting to prevent false positives
                            if 40 <= v_val <= 245:
                                if mapped_label == "₹500":
                                    # Grey note should have low saturation (copied notes are usually saturated green/blue)
                                    if s_val > 75:
                                        authenticity_status = "suspicious"
                                        flag_reason = f"Color saturation too high for grey ₹500 note ({s_val:.0f} vs expected <75)"
                                elif mapped_label == "₹50" and s_val > 25:
                                    # Cyan note expected Hue around 75 to 120
                                    if not (75 <= h_val <= 120):
                                        authenticity_status = "suspicious"
                                        flag_reason = f"Cyan color profile mismatch: Hue {h_val:.0f} (Expected ~95)"
                                elif mapped_label == "₹100" and s_val > 25:
                                    # Lavender note expected Hue around 105 to 150
                                    if not (105 <= h_val <= 150):
                                        authenticity_status = "suspicious"
                                        flag_reason = f"Lavender color profile mismatch: Hue {h_val:.0f} (Expected ~125)"
                                elif mapped_label == "₹200" and s_val > 25:
                                    # Orange-Yellow note expected Hue around 8 to 40
                                    if not (8 <= h_val <= 40):
                                        authenticity_status = "suspicious"
                                        flag_reason = f"Orange-Yellow color profile mismatch: Hue {h_val:.0f} (Expected ~20)"
                                elif mapped_label == "₹20" and s_val > 25:
                                    # Green-Yellow note expected Hue around 18 to 70
                                    if not (18 <= h_val <= 70):
                                        authenticity_status = "suspicious"
                                        flag_reason = f"Green-Yellow color profile mismatch: Hue {h_val:.0f} (Expected ~40)"
                                elif mapped_label == "₹10" and s_val > 20:
                                    # Brown note expected Hue around 0 to 28
                                    if not (0 <= h_val <= 28):
                                        authenticity_status = "suspicious"
                                        flag_reason = f"Brown color profile mismatch: Hue {h_val:.0f} (Expected ~12)"
                except Exception as ex:
                    # Fallback gracefully if crop or processing fails
                    pass
            
        formatted_predictions.append({
            'x': x,
            'y': y,
            'width': w,
            'height': h,
            'class': mapped_label,
            'confidence': confidence,
            'authenticity_status': authenticity_status,
            'flag_reason': flag_reason
        })
        
    # Calculate total value
    total_value = 0
    for denom, count in counts.items():
        try:
            val = int(denom.replace("₹", ""))
            total_value += count * val
        except ValueError:
            pass
            
    # Extract annotated image base64
    annotated_base64 = ""
    if numpy_image is not None:
        try:
            draw_img = numpy_image.copy()
            img_h, img_w = draw_img.shape[:2]
            for pred in formatted_predictions:
                x = pred.get('x', 0)
                y = pred.get('y', 0)
                w = pred.get('width', 0)
                h = pred.get('height', 0)
                label = pred.get('class')
                conf = pred.get('confidence', 0.0)
                status = pred.get('authenticity_status', 'genuine')
                
                x1 = max(0, int(x - w / 2))
                y1 = max(0, int(y - h / 2))
                x2 = min(img_w, int(x + w / 2))
                y2 = min(img_h, int(y + h / 2))
                
                # BGR color: Green (57, 255, 57) or Red (68, 68, 239)
                is_suspicious = status == "suspicious" or status == "counterfeit"
                color = (68, 68, 239) if is_suspicious else (57, 255, 57)
                
                # Draw bounding box
                cv2.rectangle(draw_img, (x1, y1), (x2, y2), color, 3, cv2.LINE_AA)
                
                # Label text
                text = f"{'ALERT: ' if is_suspicious else ''}{label} ({int(conf*100)}%)"
                
                # Text background size
                (text_w, text_h), baseline = cv2.getTextSize(text, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 1)
                
                # Background rect top-left and bottom-right
                bg_x1 = x1
                bg_y1 = max(0, y1 - text_h - 10)
                bg_x2 = min(img_w, x1 + text_w + 10)
                bg_y2 = y1
                
                cv2.rectangle(draw_img, (bg_x1, bg_y1), (bg_x2, bg_y2), (18, 7, 3), -1)
                cv2.putText(draw_img, text, (bg_x1 + 5, bg_y2 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
                
            _, buffer = cv2.imencode('.jpg', draw_img)
            annotated_base64 = base64.b64encode(buffer).decode('utf-8')
        except Exception as e:
            # Fallback to default workflow output if OpenCV draw fails
            pass

    if not annotated_base64:
        output_image = result.get('output_image')
        if output_image:
            if hasattr(output_image, 'base64_image'):
                annotated_base64 = output_image.base64_image
            elif isinstance(output_image, dict) and 'value' in output_image:
                val = output_image['value']
                if isinstance(val, str):
                    annotated_base64 = val
                elif hasattr(val, 'base64_image'):
                    annotated_base64 = val.base64_image
                elif hasattr(val, 'numpy_image'):
                    numpy_img = val.numpy_image
                    _, buffer = cv2.imencode('.jpg', numpy_img)
                    annotated_base64 = base64.b64encode(buffer).decode('utf-8')
            elif hasattr(output_image, 'numpy_image'):
                numpy_img = output_image.numpy_image
                _, buffer = cv2.imencode('.jpg', numpy_img)
                annotated_base64 = base64.b64encode(buffer).decode('utf-8')
            
    return {
        "predictions": formatted_predictions,
        "counts": counts,
        "total_value": total_value,
        "annotated_image": annotated_base64
    }

# 1. Detection Endpoint (Static Image Upload)
@app.route('/api/detect-image', methods=['POST'])
def detect_image():
    if 'image' not in request.files:
        return jsonify({"error": "No image file provided"}), 400
        
    image_file = request.files['image']
    if image_file.filename == '':
        return jsonify({"error": "No file selected"}), 400
        
    try:
        # Load API key and config
        client = get_roboflow_client()
        
        # Read file in PIL
        image_bytes = image_file.read()
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        # Keep track of original format
        if pil_image.mode == 'RGBA':
            pil_image = pil_image.convert('RGB')
            
        # Compress image if width or height exceeds 1280px to optimize network/inference time
        max_dimension = 1280
        if max(pil_image.size) > max_dimension:
            pil_image.thumbnail((max_dimension, max_dimension))
            
        # Convert PIL image to BGR numpy array
        numpy_image = np.array(pil_image)
        if len(numpy_image.shape) == 3 and numpy_image.shape[2] == 3:
            numpy_image = cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)
            
        # Run Roboflow Workflow
        results = client.run_workflow(
            workspace_name="elvis-borad",
            workflow_id="detect-count-and-visualize-3",
            images={"image": numpy_image}
        )
        
        if not results:
            return jsonify({"error": "No results returned from Roboflow workflow"}), 500
            
        result = results[0] if isinstance(results, list) else results
        
        # Load threshold setting dynamically
        threshold = float(database.get_setting('threshold', '0.5'))
        
        # Read override counterfeit setting from request form
        counterfeit_check = request.form.get('counterfeit_check', None)
        
        processed_data = process_roboflow_result(
            result, 
            threshold=threshold, 
            numpy_image=numpy_image,
            counterfeit_check=counterfeit_check
        )
        
        return jsonify(processed_data)
        
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"Error running inference: {str(e)}"}), 500

# 2. Live frame inference endpoint (Optimized Browser Camera mode)
@app.route('/api/detect-frame', methods=['POST'])
def detect_frame():
    data = request.json
    if not data or 'image' not in data:
        return jsonify({"error": "No frame data provided"}), 400
        
    try:
        client = get_roboflow_client()
        
        # Decode base64 image
        header, encoded = data['image'].split(",", 1) if "," in data['image'] else ("", data['image'])
        image_bytes = base64.b64decode(encoded)
        pil_image = Image.open(io.BytesIO(image_bytes))
        
        if pil_image.mode == 'RGBA':
            pil_image = pil_image.convert('RGB')
            
        # Webcam frames are usually 640x480 or 1280x720, but we can compress to 640 for speed in live streaming
        pil_image.thumbnail((640, 640))
        
        numpy_image = np.array(pil_image)
        if len(numpy_image.shape) == 3 and numpy_image.shape[2] == 3:
            numpy_image = cv2.cvtColor(numpy_image, cv2.COLOR_RGB2BGR)
            
        # Run workflow
        results = client.run_workflow(
            workspace_name="elvis-borad",
            workflow_id="detect-count-and-visualize-3",
            images={"image": numpy_image}
        )
        
        if not results:
            return jsonify({"error": "No results"}), 500
            
        result = results[0] if isinstance(results, list) else results
        
        # Load threshold setting dynamically
        threshold = float(database.get_setting('threshold', '0.5'))
        processed_data = process_roboflow_result(result, threshold=threshold, numpy_image=numpy_image)
        
        # Return only the predictions and counts to keep payloads small and latency ultra-low
        # The browser will draw bounding boxes dynamically over its own local video feed!
        return jsonify({
            "predictions": processed_data["predictions"],
            "counts": processed_data["counts"],
            "total_value": processed_data["total_value"]
        })
        
    except ValueError as ve:
        return jsonify({"error": str(ve)}), 400
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# 3. Settings endpoints
@app.route('/api/settings', methods=['GET'])
def get_settings():
    api_key = database.get_setting('api_key')
    region = database.get_setting('region', 'us')
    threshold = database.get_setting('threshold', '0.5')
    voice_enabled = database.get_setting('voice_enabled', '1') == '1'
    voice_rate = float(database.get_setting('voice_rate', '1.0'))
    voice_pitch = float(database.get_setting('voice_pitch', '1.0'))
    voice_voice_name = database.get_setting('voice_voice_name', '')
    chime_enabled = database.get_setting('chime_enabled', '1') == '1'
    counterfeit_check_enabled = database.get_setting('counterfeit_check_enabled', '1') == '1'
    
    # Mask API key for security
    masked_key = ""
    if api_key:
        if len(api_key) > 8:
            masked_key = api_key[:4] + "..." + api_key[-4:]
        else:
            masked_key = "Configured"
            
    return jsonify({
        "api_key_configured": bool(api_key),
        "api_key_masked": masked_key,
        "region": region,
        "threshold": float(threshold),
        "voice_enabled": voice_enabled,
        "voice_rate": voice_rate,
        "voice_pitch": voice_pitch,
        "voice_voice_name": voice_voice_name,
        "chime_enabled": chime_enabled,
        "counterfeit_check_enabled": counterfeit_check_enabled
    })

@app.route('/api/settings', methods=['POST'])
def save_settings():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    if 'api_key' in data and data['api_key'].strip():
        new_key = data['api_key'].strip()
        # Only overwrite if it is not a masked placeholder
        if "..." not in new_key and new_key != "Configured":
            database.set_setting('api_key', new_key)
            
    if 'region' in data:
        database.set_setting('region', data['region'])
        
    if 'threshold' in data:
        try:
            val = float(data['threshold'])
            if 0.0 <= val <= 1.0:
                database.set_setting('threshold', val)
            else:
                return jsonify({"error": "Threshold must be between 0 and 1"}), 400
        except ValueError:
            return jsonify({"error": "Invalid threshold value"}), 400

    if 'voice_enabled' in data:
        database.set_setting('voice_enabled', '1' if data['voice_enabled'] else '0')
        
    if 'voice_rate' in data:
        try:
            rate = float(data['voice_rate'])
            if 0.5 <= rate <= 2.0:
                database.set_setting('voice_rate', rate)
        except ValueError:
            pass
            
    if 'voice_pitch' in data:
        try:
            pitch = float(data['voice_pitch'])
            if 0.5 <= pitch <= 2.0:
                database.set_setting('voice_pitch', pitch)
        except ValueError:
            pass
            
    if 'voice_voice_name' in data:
        database.set_setting('voice_voice_name', str(data['voice_voice_name']).strip())
        
    if 'chime_enabled' in data:
        database.set_setting('chime_enabled', '1' if data['chime_enabled'] else '0')
        
    if 'counterfeit_check_enabled' in data:
        database.set_setting('counterfeit_check_enabled', '1' if data['counterfeit_check_enabled'] else '0')
            
    return jsonify({"success": True, "message": "Settings saved successfully!"})

# 4. History endpoints
@app.route('/api/history', methods=['GET'])
def get_history():
    scans = database.get_scans(limit=100)
    return jsonify(scans)

@app.route('/api/history', methods=['POST'])
def save_history():
    data = request.json
    if not data:
        return jsonify({"error": "No data provided"}), 400
        
    total_amount = data.get('total_amount', 0)
    predictions = data.get('predictions', [])
    counts = data.get('counts', {})
    screenshot_base64 = data.get('screenshot_base64') # Optional
    
    # Block saving if scan contains counterfeit or suspicious currency
    has_fake = any(p.get('authenticity_status') in ['counterfeit', 'suspicious'] for p in predictions)
    if has_fake:
        return jsonify({"error": "Cannot save scan history containing counterfeit or suspicious currency!"}), 400
        
    scan_id = database.save_scan(
        total_amount=total_amount,
        predictions=predictions,
        counts=counts,
        screenshot_base64=screenshot_base64
    )
    
    return jsonify({"success": True, "scan_id": scan_id})

@app.route('/api/history/<int:scan_id>', methods=['DELETE'])
def delete_history_item(scan_id):
    database.delete_scan(scan_id)
    return jsonify({"success": True})

@app.route('/api/history/clear', methods=['POST'])
def clear_history():
    database.clear_scans()
    return jsonify({"success": True})

if __name__ == '__main__':
    # Flask port 5005 to avoid conflicts on 5000
    app.run(host='0.0.0.0', port=5005, debug=True)
