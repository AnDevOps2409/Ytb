import "./FormattedTranscript.css";

export default function FormattedTranscript({ transcript }) {
  const rawLines = transcript.split("\n").map((l) => l.trim()).filter(Boolean);
  const displayParagraphs = [];

  rawLines.forEach((line) => {
    // If line is super long and doesn't look like a timestamped line, break it up
    if (line.length > 350 && !line.match(/^\[?\d{1,2}:\d{2}/)) {
      // Split mostly by sentence-ending punctuation.
      const sentences = line.match(/[^.!?]+[.!?]+/g) || [line];
      let currentChunk = "";
      sentences.forEach((s) => {
        currentChunk += s + " ";
        if (currentChunk.length > 250) {
          displayParagraphs.push(currentChunk.trim());
          currentChunk = "";
        }
      });
      if (currentChunk.trim()) displayParagraphs.push(currentChunk.trim());
    } else {
      displayParagraphs.push(line);
    }
  });

  return (
    <div className="formatted-transcript">
      {displayParagraphs.map((line, i) => {
        // Match Timestamp at start (e.g., "[00:00]", "01:23 ")
        const timeMatch = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s*(.*)/);
        if (timeMatch) {
          return (
            <div key={i} className="transcript-line">
              <span className="transcript-time">{timeMatch[1]}</span>
              <span className="transcript-text">{timeMatch[2]}</span>
            </div>
          );
        }

        // Match Speaker (e.g., "Người 1:", "John Doe: ")
        const speakerMatch = line.match(/^([^:]{2,30}):\s*(.*)/);
        if (speakerMatch && speakerMatch[1].split(" ").length <= 4) {
          // Name should not be too long
          return (
            <div key={i} className="transcript-line">
              <span className="transcript-speaker">{speakerMatch[1]}:</span>
              <span className="transcript-text">{speakerMatch[2]}</span>
            </div>
          );
        }

        // Regular text block formatting
        return (
          <div key={i} className="transcript-paragraph">
            {line}
          </div>
        );
      })}
    </div>
  );
}
