import { useEffect, useState } from "react";
import "./ProcessingStatus.css";

export default function ProcessingStatus({ steps, currentStep }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
  }, []);

  return (
    <div className={`processing ${visible ? "processing--visible" : ""}`}>
      <div className="processing__spinner">
        <div className="processing__spinner-ring" />
      </div>
      <div className="processing__steps">
        {steps.map((step, index) => {
          let status = "pending";
          if (index < currentStep) status = "done";
          else if (index === currentStep) status = "active";

          return (
            <div key={index} className={`processing__step processing__step--${status}`}>
              <div className="processing__step-icon">
                {status === "done" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : status === "active" ? (
                  <div className="processing__dot" />
                ) : (
                  <div className="processing__dot processing__dot--muted" />
                )}
              </div>
              <span className="processing__step-text">{step}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
