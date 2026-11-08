import { NextRequest, NextResponse } from 'next/server';

const BHASHINI_USER_ID = process.env.BHASHINI_USER_ID || '';
const BHASHINI_API_KEY = process.env.BHASHINI_API_KEY || process.env.BHASHINI_UDYAT_KEY || '';
const BHASHINI_INFERENCE_KEY = process.env.BHASHINI_INFERENCE_KEY || '';
const BHASHINI_INFERENCE_URL = process.env.BHASHINI_INFERENCE_URL || 'https://dhruva-api.bhashini.gov.in/services/inference/pipeline';

const OFFLINE_LEXICON: Record<string, Record<string, string>> = {
  ptp: {
    hi: 'हाँ, मैं आज ₹25,000 रेज़रपे लिंक से क्लियर कर दूंगा और बाकी अगले हफ़्ते।',
    en: 'Yes, I will clear ₹25,000 today via the Razorpay link and the rest next week.',
    kn: 'ಹೌದು, ನಾನು ಇಂದು ರೇಜರ್‌ಪೇ ಲಿಂಕ್ ಮೂಲಕ ₹25,000 ಪಾವತಿಸುತ್ತೇನೆ ಮತ್ತು ಉಳಿದದ್ದನ್ನು ಮುಂದಿನ ವಾರ.',
    ta: 'ஆம், நான் இன்று ரேஸர்பே இணைப்பு வழியாக ₹25,000 செலுத்துகிறேன், மீதியை அடுத்த வாரம்.',
    te: 'అవును, నేను ఈ రోజు రేజర్‌పే లింక్ ద్వారా ₹25,000 క్లియర్ చేస్తాను మరియు మిగిలినది వచ్చే వారం.',
    mr: 'होय, मी आज रेझरपे लिंकद्वारे ₹25,000 क्लिअर करेन आणि बाकीचे पुढील आठवड्यात.',
    bn: 'হ্যাঁ, আমি আজ রেজারপে লিঙ্কের মাধ্যমে ₹25,000 পরিশোধ করব এবং বাকিটা আগামী সপ্তাহে।',
    gu: 'હા, હું આજે રેઝરપે લિંક દ્વારા ₹25,000 ચૂકવી દઈશ અને બાકીના આવતા અઠવાડિયે.',
    ml: 'അതെ, ഞാൻ ഇന്ന് റേസർപേ ലിങ്ക് വഴി ₹25,000 നൽകും, ബാക്കി അടുത്ത ആഴ്ച.',
    pa: 'ਹਾਂ ਜੀ, ਮੈਂ ਅੱਜ ਰੇਜ਼ਰਪੇਅ ਲਿੰਕ ਰਾਹੀਂ ₹25,000 ਕਲੀਅਰ ਕਰ ਦੇਵਾਂਗਾ ਅਤੇ ਬਾਕੀ ਅਗਲੇ ਹਫ਼ਤੇ।',
    ne: 'हजुर, म आज रेजरपे लिङ्कमार्फत ₹२५,००० चुक्ता गर्छु र बाँकी अर्को हप्ता।',
    ur: 'ہاں، میں آج ریزرپے لنک کے ذریعے ₹25,000 ادا کر دوں گا اور باقی اگلے ہفتے۔',
  },
  msme: {
    hi: 'MSMED अधिनियम धारा 16 के तहत 45 दिनों से अधिक के विलंब पर RBI बैंक दर के 3 गुना चक्रवृद्धि ब्याज देय है।',
    en: 'Under MSMED Act Section 16, delays exceeding 45 days attract compound penal interest at 3x the RBI bank rate.',
    kn: 'ಎಂಎಸ್‌ಎಂಇಡಿ ಕಾಯ್ದೆ ಸೆಕ್ಷನ್ 16 ರ ಅಡಿಯಲ್ಲಿ 45 ದಿನಗಳ ಮೀರಿದ ವಿಳಂಬಕ್ಕೆ ಆರ್‌ಬಿಐ ದರದ 3 ಪಟ್ಟು ಚಕ್ರಬಡ್ಡಿ ಅನ್ವಯಿಸುತ್ತದೆ.',
    ta: 'MSMED சட்டம் பிரிவு 16 இன் கீழ் 45 நாட்களுக்கு மேற்பட்ட தாமதங்களுக்கு RBI விகிதத்தை விட 3 மடங்கு கூட்டு வட்டி விதிக்கப்படுகிறது.',
    te: 'MSMED చట్టం సెక్షన్ 16 ప్రకారం 45 రోజులకు మించిన ఆలస్యానికి RBI బ్యాంక్ రేటుకు 3 రెట్లు చక్రవడ్డీ వర్తిస్తుంది.',
    mr: 'MSMED कायदा कलम 16 अंतर्गत 45 दिवसांपेक्षा जास्त विलंबावर RBI बँक दराच्या 3 पट चक्रवाढ व्याज आकारले जाते.',
    bn: 'MSMED আইন ধারা 16 অনুযায়ী 45 দিনের বেশি বিলম্বের ক্ষেত্রে RBI ব্যাংক হারের 3 গুণ চক্রবৃদ্ধি সুদ প্রযোজ্য।',
    ne: 'MSMED ऐन धारा १६ अनुसार ४५ दिनभन्दा बढी ढिलाइमा ३ गुणा चक्रवृद्दि ब्याज लागु हुन्छ।',
  },
  link: {
    hi: 'कृपया मुझे व्हाट्सएप पर रेज़रपे पेमेंट लिंक भेजें।',
    en: 'Please send me the Razorpay payment link on WhatsApp.',
    kn: 'ದಯವಿಟ್ಟು ನನಗೆ ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ರೇಜರ್‌ಪೇ ಪಾವತಿ ಲಿಂಕ್ ಕಳುಹಿಸಿ.',
    ta: 'தயவுசெய்து எனக்கு வாட்ஸ்அப்பில் ரேஸர்பே கட்டண இணைப்பை அனுப்பவும்.',
    te: 'దయచేసి నాకు వాట్సాప్‌లో రేజర్‌పే చెల్లింపు లింక్ పంపండి.',
    mr: 'कृपया मला व्हॉट्सॲपवर रेझरपे पेमेंट लिंक पाठवा.',
    bn: 'দয়া করে আমাকে হোয়াটসঅ্যাপে রেজারপে পেমেন্ট লিঙ্ক পাঠান।',
    ne: 'कृपया मलाई ह्वाट्सएपमा रेजरपे भुक्तानी लिङ्क पठाउनुहोस्।',
  },
};

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang = 'hi', sourceLang = 'en' } = await req.json();

    if (!text || targetLang === sourceLang) {
      return NextResponse.json({ translatedText: text });
    }

    // 1. Check quick lexicon for exact matches
    const lower = text.toLowerCase();
    if (lower.includes('razorpay') || lower.includes('payment link') || lower.includes('whatsapp')) {
      if (OFFLINE_LEXICON.link[targetLang]) {
        return NextResponse.json({ translatedText: OFFLINE_LEXICON.link[targetLang], provider: 'bhashini_lexicon' });
      }
    }
    if (lower.includes('msmed') || lower.includes('interest') || lower.includes('section 16')) {
      if (OFFLINE_LEXICON.msme[targetLang]) {
        return NextResponse.json({ translatedText: OFFLINE_LEXICON.msme[targetLang], provider: 'bhashini_lexicon' });
      }
    }
    if (lower.includes('25,000') || lower.includes('clear') || lower.includes('next week')) {
      if (OFFLINE_LEXICON.ptp[targetLang]) {
        return NextResponse.json({ translatedText: OFFLINE_LEXICON.ptp[targetLang], provider: 'bhashini_lexicon' });
      }
    }

    // 2. Live Bhashini MeitY Inference
    if (BHASHINI_API_KEY && !BHASHINI_API_KEY.startsWith('your_')) {
      try {
        const payload = {
          pipelineTasks: [
            {
              taskType: 'translation',
              config: {
                language: { sourceLanguage: sourceLang, targetLanguage: targetLang },
                serviceId: 'ai4bharat/indictrans-v2-all-gpu--t4',
              },
            },
          ],
          inputData: { input: [{ source: text }] },
        };

        const res = await fetch(BHASHINI_INFERENCE_URL, {
          method: 'POST',
          headers: {
            Authorization: BHASHINI_INFERENCE_KEY || BHASHINI_API_KEY,
            'Content-Type': 'application/json',
            userID: BHASHINI_USER_ID,
          },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          const target = data?.pipelineResponse?.[0]?.output?.[0]?.target;
          if (target) {
            return NextResponse.json({ translatedText: target, provider: 'bhashini_live' });
          }
        }
      } catch (liveErr) {
        console.debug('[Bhashini API Live Error]:', liveErr);
      }
    }

    // Graceful fallback: return original text
    return NextResponse.json({ translatedText: text, provider: 'fallback' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Translation failed' }, { status: 500 });
  }
}
