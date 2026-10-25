import { Activity } from "lucide-react";


function BCSCard({
  bcsClass,
  confidence
}) {

  const percentage =
    (confidence * 100).toFixed(2);


  const isOverweight =
    bcsClass === "Overweight";


  return (

    <div className="result-card">

      {/* ICON */}

      <div className="result-card-icon">

        <Activity size={22} />

      </div>


      {/* CONTENT */}

      <div className="result-card-content">

        <span className="result-label">
          BODY CONDITION
        </span>


        <h3 className="prediction-value">

          {bcsClass}

        </h3>


        <div className="confidence-wrapper">

          <div className="confidence-label">

            <span>
              Confidence
            </span>

            <strong>
              {percentage}%
            </strong>

          </div>


          <div className="confidence-track">

            <div
              className="confidence-fill"
              style={{
                width: `${percentage}%`
              }}
            />

          </div>

        </div>


        {/* STATUS */}

        <div
          className={
            isOverweight
              ? "bcs-status overweight"
              : "bcs-status normal"
          }
        >

          {isOverweight
            ? "Overweight condition detected"
            : "Normal body condition"
          }

        </div>

      </div>

    </div>

  );
}


export default BCSCard;