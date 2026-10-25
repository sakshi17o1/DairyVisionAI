import { useRef, useState } from "react";
import { Upload, Image, Video, X } from "lucide-react";

function UploadBox({ onFileSelected }) {
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file) => {
    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/jpg",
      "video/mp4",
      "video/avi",
      "video/quicktime",
    ];

    if (!allowedTypes.includes(file.type)) {
      alert("Please select a JPG, JPEG, PNG, MP4, AVI or MOV file.");
      return;
    }

    setSelectedFile(file);

    if (file.type.startsWith("image/")) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }

    if (onFileSelected) {
      onFileSelected(file);
    }
  };

  const handleInputChange = (event) => {
    const file = event.target.files[0];
    handleFile(file);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    handleFile(file);
  };

  const removeFile = () => {
    setSelectedFile(null);
    setPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    if (onFileSelected) {
      onFileSelected(null);
    }
  };

  return (
    <div
      className={`upload-box ${isDragging ? "dragging" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      {!selectedFile ? (
        <>
          <div className="upload-icon">
            <Upload size={34} />
          </div>

          <h2>Upload livestock image or video</h2>

          <p>
            Select an image or video file from your device
          </p>

          <button
            className="choose-file-btn"
            onClick={() => fileInputRef.current.click()}
          >
            <Upload size={19} />
            Choose File
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.mp4,.avi,.mov"
            onChange={handleInputChange}
            hidden
          />

          <span className="supported-formats">
            Supported formats: JPG, JPEG, PNG, MP4, AVI, MOV
          </span>
        </>
      ) : (
        <div className="selected-file-container">

          <div className="file-header">
            <div>
              {selectedFile.type.startsWith("image/") ? (
                <Image size={22} />
              ) : (
                <Video size={22} />
              )}

              <strong>{selectedFile.name}</strong>
            </div>

            <button
              className="remove-file-btn"
              onClick={removeFile}
            >
              <X size={20} />
            </button>
          </div>

          {preview && (
            <div className="image-preview">
              <img
                src={preview}
                alt="Livestock preview"
              />
            </div>
          )}

          {!preview && (
            <div className="video-preview-placeholder">
              <Video size={45} />
              <p>Video selected</p>
            </div>
          )}

          <p className="file-size">
            {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
          </p>

          <button
            className="change-file-btn"
            onClick={() => fileInputRef.current.click()}
          >
            Choose Another File
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.mp4,.avi,.mov"
            onChange={handleInputChange}
            hidden
          />

        </div>
      )}
    </div>
  );
}

export default UploadBox;