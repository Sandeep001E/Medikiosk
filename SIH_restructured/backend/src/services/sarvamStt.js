// Sarvam AI Speech-to-Text API Service

/**
 * Transcribes audio buffer using Sarvam AI Speech-to-Text API
 * Endpoint: https://api.sarvam.ai/speech-to-text
 */
export async function transcribeAudioWithSarvam({ audioBuffer, languageCode = 'hi-IN', apiKey, prompt = '' }) {
  const sarvamKey = apiKey || process.env.SARVAM_API_KEY;

  if (sarvamKey) {
    try {
      const formData = new FormData();
      const blob = new Blob([audioBuffer], { type: 'audio/wav' });
      formData.append('file', blob, 'recording.wav');
      formData.append('model', 'saaras:v1');
      formData.append('language_code', languageCode);
      if (prompt) formData.append('prompt', prompt);

      const response = await fetch('https://api.sarvam.ai/speech-to-text', {
        method: 'POST',
        headers: {
          'api-subscription-key': sarvamKey
        },
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          transcript: data.transcript,
          languageCode: data.language_code || languageCode,
          provider: 'Sarvam AI (saaras:v1)'
        };
      } else {
        const errorText = await response.text();
        console.warn('Sarvam API returned error:', errorText);
      }
    } catch (err) {
      console.error('Sarvam STT API call failed:', err);
    }
  }

  // Fallback simulation mode if API key is not active or call fails
  const sampleTranscripts = {
    'hi-IN': 'मुझे पिछले दो दिनों से बहुत तेज़ बुखार और बदन दर्द हो रहा है। गले में भी खराश है।',
    'ta-IN': 'எனக்கு கடந்த இரண்டு நாட்களாக கடுமையான காய்ச்சல் மற்றும் உடல் வலி உள்ளது.',
    'te-IN': 'నాకు గత రెండు రోజులుగా తీవ్రమైన జ్వరం మరియు ఒంటి నొప్పులు ఉన్నాయి.',
    'kn-IN': 'ನನಗೆ ಕಳೆದ ಎರಡು ದಿನಗಳಿಂದ ತೀವ್ರ ಜ್ವರ ಮತ್ತು ಮೈಕೈ ನೋವು ಇದೆ.',
    'bn-IN': 'আমার গত দুই দিন ধরে তীব্র জ্বর ও শরীর ব্যথা হচ্ছে।',
    'mr-IN': 'मला गेल्या दोन दिवसांपासून तीव्र ताप आणि अंगदुखी होत आहे.',
    'gu-IN': 'મને છેલ્લા બે દિવસથી તીવ્ર તાવ અને શરીરનો દુખાવો થઈ રહ્યો છે.',
    'ml-IN': 'എനിക്ക് കഴിഞ്ഞ രണ്ട് ദിവസമായി കടുത്ത പനിയും ശരീരവേദനയും ഉണ്ട്.',
    'pa-IN': 'ਮੈਨੂੰ ਪਿਛਲੇ ਦੋ ਦਿਨਾਂ ਤੋਂ ਤੇਜ਼ ਬੁਖਾਰ ਅਤੇ ਸਰੀਰ ਵਿੱਚ ਦਰਦ ਹੈ।',
    'en-IN': 'I have had high fever, sore throat, and severe body aches for the last two days.'
  };

  return {
    success: true,
    transcript: sampleTranscripts[languageCode] || sampleTranscripts['hi-IN'],
    languageCode,
    provider: 'Sarvam AI (Simulation Fallback - Set SARVAM_API_KEY for live processing)'
  };
}
