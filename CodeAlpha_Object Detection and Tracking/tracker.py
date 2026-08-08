import numpy as np

def get_iou(box1, box2):
    """
    Computes Intersection over Union (IoU) between two bounding boxes.
    Box format: [x1, y1, x2, y2]
    """
    xi1 = max(box1[0], box2[0])
    yi1 = max(box1[1], box2[1])
    xi2 = min(box1[2], box2[2])
    yi2 = min(box1[3], box2[3])
    
    inter_area = max(0, xi2 - xi1) * max(0, yi2 - yi1)
    
    box1_area = (box1[2] - box1[0]) * (box1[3] - box1[1])
    box2_area = (box2[2] - box2[0]) * (box2[3] - box2[1])
    
    union_area = box1_area + box2_area - inter_area
    if union_area == 0:
        return 0
    return inter_area / union_area

class Track:
    """
    Represents an individual tracked object.
    Uses a simple constant-velocity motion model with exponential smoothing.
    """
    def __init__(self, track_id, bbox, class_id, conf):
        self.id = track_id
        self.bbox = list(bbox)  # [x1, y1, x2, y2]
        self.class_id = int(class_id)
        self.conf = float(conf)
        self.age = 0
        self.hits = 1
        
        # State: [center_x, center_y, width, height, d_cx, d_cy, d_w, d_h]
        x1, y1, x2, y2 = bbox
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        cx = x1 + w / 2
        cy = y1 + h / 2
        
        self.state = [cx, cy, w, h, 0.0, 0.0, 0.0, 0.0]

    def predict(self):
        """
        Advance the state using the velocity vector and increase age.
        """
        self.state[0] += self.state[4]  # cx = cx + d_cx
        self.state[1] += self.state[5]  # cy = cy + d_cy
        self.state[2] += self.state[6]  # w = w + d_w
        self.state[3] += self.state[7]  # h = h + d_h
        
        # Safeguard width and height to be positive
        self.state[2] = max(5.0, self.state[2])
        self.state[3] = max(5.0, self.state[3])
        
        self.age += 1
        return self.get_bbox()

    def update(self, bbox, conf):
        """
        Update the state with a new bounding box measurement and adjust velocities.
        """
        x1, y1, x2, y2 = bbox
        w = max(1.0, x2 - x1)
        h = max(1.0, y2 - y1)
        cx = x1 + w / 2
        cy = y1 + h / 2
        
        # Exponential moving average filter for velocity smoothing
        alpha = 0.5
        self.state[4] = alpha * (cx - self.state[0]) + (1 - alpha) * self.state[4]
        self.state[5] = alpha * (cy - self.state[1]) + (1 - alpha) * self.state[5]
        self.state[6] = alpha * (w - self.state[2]) + (1 - alpha) * self.state[6]
        self.state[7] = alpha * (h - self.state[3]) + (1 - alpha) * self.state[7]
        
        # Update current coordinates
        self.state[0] = cx
        self.state[1] = cy
        self.state[2] = w
        self.state[3] = h
        
        self.bbox = list(bbox)
        self.conf = float(conf)
        self.age = 0
        self.hits += 1

    def get_bbox(self):
        """
        Convert internal state back to [x1, y1, x2, y2]
        """
        cx, cy, w, h = self.state[0:4]
        x1 = cx - w / 2
        y1 = cy - h / 2
        x2 = cx + w / 2
        y2 = cy + h / 2
        return [x1, y1, x2, y2]

class SortTracker:
    """
    SORT-like multi-object tracker that correlates detections across frames.
    """
    def __init__(self, max_age=15, min_hits=2, min_iou=0.3):
        self.max_age = max_age
        self.min_hits = min_hits
        self.min_iou = min_iou
        self.tracks = []
        self.next_id = 1

    def update(self, detections):
        """
        Args:
            detections: List of [x1, y1, x2, y2, confidence, class_id]
        Returns:
            List of active tracks: [x1, y1, x2, y2, track_id, class_id, confidence]
        """
        # 1. Predict next bounding box locations for all active tracks
        predicted_boxes = []
        for track in self.tracks:
            predicted_boxes.append(track.predict())

        # 2. Match predicted boxes with detections using greedy IoU pairing
        matched_pairs = []
        unmatched_detections = list(range(len(detections)))
        unmatched_tracks = list(range(len(self.tracks)))

        if len(self.tracks) > 0 and len(detections) > 0:
            # Build IoU Matrix
            iou_matrix = np.zeros((len(self.tracks), len(detections)), dtype=np.float32)
            for t_idx, pred_box in enumerate(predicted_boxes):
                for d_idx, det in enumerate(detections):
                    iou_matrix[t_idx, d_idx] = get_iou(pred_box, det[:4])

            # Iteratively select match with maximum IoU
            while True:
                max_val = np.max(iou_matrix)
                if max_val < self.min_iou:
                    break
                
                # Find index of maximum IoU
                t_idx, d_idx = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                
                # Match them
                matched_pairs.append((t_idx, d_idx))
                
                # Zero out row/col in matrix
                iou_matrix[t_idx, :] = -1
                iou_matrix[:, d_idx] = -1
                
                if t_idx in unmatched_tracks:
                    unmatched_tracks.remove(t_idx)
                if d_idx in unmatched_detections:
                    unmatched_detections.remove(d_idx)

        # 3. Update tracks with matched detections
        for t_idx, d_idx in matched_pairs:
            self.tracks[t_idx].update(detections[d_idx][:4], detections[d_idx][4])
            self.tracks[t_idx].class_id = int(detections[d_idx][5])

        # 4. Initialize new tracks for unmatched detections
        for d_idx in unmatched_detections:
            det = detections[d_idx]
            new_track = Track(self.next_id, det[:4], det[5], det[4])
            self.tracks.append(new_track)
            self.next_id += 1

        # 5. Cull inactive/dead tracks
        self.tracks = [t for t in self.tracks if t.age <= self.max_age]

        # 6. Build list of active tracks to return
        active_tracks = []
        for t in self.tracks:
            # Return track if it has enough hits OR was just initialized and matched
            if t.hits >= self.min_hits or t.age == 0:
                bbox = t.get_bbox()
                active_tracks.append([
                    max(0, bbox[0]), max(0, bbox[1]), 
                    max(0, bbox[2]), max(0, bbox[3]), 
                    t.id, t.class_id, t.conf
                ])

        return active_tracks
