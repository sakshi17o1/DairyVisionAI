import cv2

from inference.behaviour import predict_behaviour


VIDEO_PATH = r"E:\DairyVisionAI\test_behaviour.mp4"


def extract_six_frames(video_path):
    """
    Extract exactly 6 consecutive valid frames
    from the video.
    """

    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        raise RuntimeError(
            f"Could not open video:\n{video_path}"
        )

    frames = []

    while len(frames) < 6:
        success, frame = cap.read()

        if not success:
            break

        frames.append(frame)

    cap.release()

    if len(frames) < 6:
        raise RuntimeError(
            f"Video contains only {len(frames)} usable frames. "
            f"Behaviour model requires 6 frames."
        )

    return frames


def main():

    print("=" * 60)
    print("BEHAVIOUR PREDICTION TEST")
    print("=" * 60)

    print(f"Video: {VIDEO_PATH}")

    frames = extract_six_frames(VIDEO_PATH)

    print(f"Frames extracted: {len(frames)}")

    result = predict_behaviour(frames)

    print("\nBehaviour Result")
    print("-" * 40)

    print(
        f"Behaviour: {result['behaviour']}"
    )

    print(
        f"Confidence: {result['confidence']}%"
    )

    print(
        f"Frames analyzed: {len(frames)}"
    )

    print("=" * 60)
    print("BEHAVIOUR PREDICTION SUCCESS")
    print("=" * 60)


if __name__ == "__main__":
    main()