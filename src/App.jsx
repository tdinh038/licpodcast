import React, { useState, useRef, useEffect } from 'react';

function App() {
  const [file, setFile] = useState(null);
  const [words, setWords] = useState([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [ready, setReady] = useState(false);
  const [fallbackTranscript, setFallbackTranscript] = useState('');
  const audioRef = useRef(null);

  useEffect(() => {
    // Ping backend to warm it up
    fetch('https://licpodcast.onrender.com')
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (!audioRef.current || words.length === 0) return;
      const currentTime = audioRef.current.currentTime * 1000;
      const index = words.findIndex(w => currentTime >= w.start && currentTime <= w.end);
      if (index !== -1) setHighlightedIndex(index);
    }, 100);
    return () => clearInterval(interval);
  }, [words]);

  const uploadAndTranscribe = async (audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await fetch('https://licpodcast.onrender.com/transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Failed to transcribe');
    }

    return await response.json(); // expects array of { word, start, end }
  };

  const handleChange = async (event) => {
    const uploadedFile = event.target.files[0];
    if (!uploadedFile || !uploadedFile.name.endsWith('.wav')) {
      alert('Please upload a .wav audio file');
      return;
    }

    setFile(uploadedFile);
    setWords([]);
    setHighlightedIndex(0);
    setFallbackTranscript('Transcribing...');

    try {
      const result = await uploadAndTranscribe(uploadedFile);
      setWords(result);
      setFallbackTranscript('');
    } catch (err) {
      console.error(err);
      setFallbackTranscript('Transcription failed.');
    }
  };

  return (
    <div style={{ padding: '2rem', fontFamily: 'Arial' }}>
      <h2>🎧 Upload + Play Audio</h2>
      {!ready && <p>⏳ Warming up server...</p>}
      <input
        type="file"
        accept="audio/wav"
        onChange={handleChange}
        disabled={!ready}
      />
      {file && (
        <audio
          ref={audioRef}
          controls
          src={URL.createObjectURL(file)}
          style={{ marginTop: '1rem', width: '100%' }}
        />
      )}

      <h3 style={{ marginTop: '2rem' }}>📝 Transcript</h3>
      <div style={{
        border: '1px solid #ccc',
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        lineHeight: '1.6'
      }}>
        {words.length > 0 ? (
          words.map((w, i) => (
            <span
              key={i}
              style={{
                fontWeight: i === highlightedIndex ? 'bold' : 'normal',
                backgroundColor: i === highlightedIndex ? '#ffeb3b' : 'transparent',
                marginRight: '0.25rem'
              }}
            >
              {w.word}
            </span>
          ))
        ) : (
          fallbackTranscript || 'No transcript yet.'
        )}
      </div>
    </div>
  );
}

export default App;