/**
 * RevClaim AI — Bhashini (Digital India / MeitY) Multilingual Integration
 * Sovereign Indic Translation & National Language Bridge (26 Languages)
 * 
 * Supports:
 * - 22 Eighth Schedule Indian Languages + Cross-Border (Nepali, Bengali/Bangla)
 * - IndicTrans2 NMT Translation Bridge
 * - Localized Debt Recovery Quick Chips & Promise-To-Pay (PTP) Suggestions
 */

export interface BhashiniLanguage {
  value: string;
  label: string;
  native: string;
  short: string;
  flag: string;
  region: string;
}

export const BHASHINI_LANGUAGES: BhashiniLanguage[] = [
  { value: 'hi', label: 'हिन्दी (Hindi)', native: 'हिन्दी', short: '🇮🇳 HI', flag: '🇮🇳', region: 'North / Central India' },
  { value: 'en', label: 'English (India)', native: 'English', short: '🇮🇳 EN', flag: '🇮🇳', region: 'Pan-India Corporate' },
  { value: 'kn', label: 'ಕನ್ನಡ (Kannada)', native: 'ಕನ್ನಡ', short: '🇮🇳 KN', flag: '🇮🇳', region: 'Bengaluru / Karnataka' },
  { value: 'ta', label: 'தமிழ் (Tamil)', native: 'தமிழ்', short: '🇮🇳 TA', flag: '🇮🇳', region: 'Chennai / Tamil Nadu' },
  { value: 'te', label: 'తెలుగు (Telugu)', native: 'తెలుగు', short: '🇮🇳 TE', flag: '🇮🇳', region: 'Hyderabad / Andhra & Telangana' },
  { value: 'mr', label: 'मराठी (Marathi)', native: 'मराठी', short: '🇮🇳 MR', flag: '🇮🇳', region: 'Mumbai / Pune / Maharashtra' },
  { value: 'bn', label: 'বাংলা (Bengali)', native: 'বাংলা', short: '🇮🇳/🇧🇩 BN', flag: '🇮🇳', region: 'Kolkata / WB & Bangladesh' },
  { value: 'gu', label: 'ગુજરાતી (Gujarati)', native: 'ગુજરાતી', short: '🇮🇳 GU', flag: '🇮🇳', region: 'Ahmedabad / Surat / Gujarat' },
  { value: 'ml', label: 'മലയാളം (Malayalam)', native: 'മലയാളം', short: '🇮🇳 ML', flag: '🇮🇳', region: 'Kochi / Kerala' },
  { value: 'pa', label: 'ਪੰਜਾਬੀ (Punjabi)', native: 'ਪੰਜਾਬੀ', short: '🇮🇳 PA', flag: '🇮🇳', region: 'Ludhiana / Punjab' },
  { value: 'or', label: 'ଓଡ଼ିଆ (Odia)', native: 'ଓଡ଼ିଆ', short: '🇮🇳 OR', flag: '🇮🇳', region: 'Bhubaneswar / Odisha' },
  { value: 'ks', label: 'कॉशुर (Kashmiri)', native: 'کٲشُر / कॉशुर', short: '🇮🇳 KS', flag: '🇮🇳', region: 'Srinagar / Kashmir' },
  { value: 'ne', label: 'नेपाली (Nepali)', native: 'नेपाली', short: '🇳🇵 NE', flag: '🇳🇵', region: 'Kathmandu / Nepal & Sikkim' },
  { value: 'as', label: 'অসমীয়া (Assamese)', native: 'অসমীয়া', short: '🇮🇳 AS', flag: '🇮🇳', region: 'Guwahati / Assam' },
  { value: 'ur', label: 'اردو (Urdu)', native: 'اردو', short: '🇮🇳 UR', flag: '🇮🇳', region: 'Delhi / Lucknow / Hyderabad' },
  { value: 'mai', label: 'मैथिली (Maithili)', native: 'मैथिली', short: '🇮🇳 MAI', flag: '🇮🇳', region: 'Mithila / Bihar / Terai' },
  { value: 'sa', label: 'संस्कृतम् (Sanskrit)', native: 'संस्कृतम्', short: '🇮🇳 SA', flag: '🇮🇳', region: 'Classical India' },
  { value: 'sd', label: 'سنڌي (Sindhi)', native: 'سنڌي / सिन्धी', short: '🇮🇳 SD', flag: '🇮🇳', region: 'Sindhi Commercial Centers' },
  { value: 'kok', label: 'कोंकणी (Konkani)', native: 'कोंकणी', short: '🇮🇳 KOK', flag: '🇮🇳', region: 'Goa / Karavali' },
  { value: 'doi', label: 'डोगरी (Dogri)', native: 'डोगरी', short: '🇮🇳 DOI', flag: '🇮🇳', region: 'Jammu' },
  { value: 'mni', label: 'মৈতৈলোন্ (Manipuri)', native: 'মৈতৈলোন্', short: '🇮🇳 MNI', flag: '🇮🇳', region: 'Imphal / Manipur' },
  { value: 'sat', label: 'ᱥᱟᱱᱛᱟᱲᱤ (Santali)', native: 'ᱥᱟᱱᱛᱟᱲᱤ', short: '🇮🇳 SAT', flag: '🇮🇳', region: 'Jharkhand / Chota Nagpur' },
  { value: 'brx', label: 'बड़ो (Bodo)', native: 'बड़ो', short: '🇮🇳 BRX', flag: '🇮🇳', region: 'Bodoland / Assam' },
  { value: 'bho', label: 'भोजपुरी (Bhojpuri)', native: 'भोजपुरी', short: '🇮🇳 BHO', flag: '🇮🇳', region: 'Purvanchal / Bihar' },
  { value: 'raj', label: 'राजस्थानी (Rajasthani)', native: 'राजस्थानी', short: '🇮🇳 RAJ', flag: '🇮🇳', region: 'Jaipur / Jodhpur / Rajasthan' },
  { value: 'mwr', label: 'मारवाड़ी (Marwari)', native: 'मारवाड़ी', short: '🇮🇳 MWR', flag: '🇮🇳', region: 'Marwar / B2B Traders' },
];

/**
 * Localized Debt Recovery Quick Suggestions for all primary business corridors
 */
export const MULTILINGUAL_RECOVERY_SUGGESTIONS: Record<string, string[]> = {
  hi: [
    'आज ₹25,000 रेज़रपे से क्लियर कर सकता हूँ',
    'मुझे व्हाट्सएप पर पेमेंट लिंक भेजें',
    'बाकी बैलेंस 7 दिन में दे पाऊंगा',
    'MSMED एक्ट धारा 16 का क्या नियम है?',
  ],
  en: [
    'Can clear ₹25,000 today via Razorpay',
    'Please WhatsApp me the payment link',
    'Can I pay the rest in 7 days?',
    'What is the MSMED Act Section 16 rule?',
  ],
  kn: [
    'ಇಂದು ₹25,000 ರೇಜರ್‌ಪೇ ಮೂಲಕ ಪಾವತಿಸಬಹುದು',
    'ವಾಟ್ಸಾಪ್‌ನಲ್ಲಿ ಪಾವತಿ ಲಿಂಕ್ ಕಳುಹಿಸಿ',
    'ಉಳಿದ ಹಣವನ್ನು 7 ದಿನಗಳಲ್ಲಿ ನೀಡುತ್ತೇನೆ',
    'ಎಂಎಸ್‌ಎಂಇಡಿ ಕಾಯ್ದೆ ಸೆಕ್ಷನ್ 16 ರ ನಿಯಮವೇನು?',
  ],
  ta: [
    'இன்று ரேஸர்பே மூலம் ₹25,000 செலுத்த முடியும்',
    'வாட்ஸ்அப்பில் கட்டண இணைப்பை அனுப்பவும்',
    'மீதமுள்ள தொகையை 7 நாட்களில் தருகிறேன்',
    'MSMED சட்டம் பிரிவு 16 விதி என்ன?',
  ],
  te: [
    'ఈ రోజు రేజర్‌పే ద్వారా ₹25,000 చెల్లించగలను',
    'వాట్సాప్‌లో చెల్లింపు లింక్ పంపండి',
    'మిగిలిన బ్యాలెన్స్ 7 రోజుల్లో చెల్లిస్తాను',
    'MSMED చట్టం సెక్షన్ 16 నియమం ఏమిటి?',
  ],
  mr: [
    'आज रेझरपेद्वारे ₹25,000 क्लिअर करू शकतो',
    'व्हॉट्सॲपवर पेमेंट लिंक पाठवा',
    'बाकी रक्कम 7 दिवसांत देईन',
    'MSMED कायदा कलम 16 चा नियम काय आहे?',
  ],
  bn: [
    'আজ রেজারপে দিয়ে ₹25,000 দিতে পারব',
    'হোয়াটসঅ্যাপে পেমেন্ট লিঙ্ক পাঠান',
    'বাকি টাকা 7 দিনের মধ্যে দেব',
    'MSMED আইন ধারা 16 নিয়ম কি?',
  ],
  gu: [
    'આજે રેઝરપે દ્વારા ₹25,000 ચૂકવી શકું છું',
    'વોટ્સએપ પર પેમેન્ટ લિંક મોકલો',
    'બાકી રકમ 7 દિવસમાં આપીશ',
    'MSMED કાયદાની કલમ 16 નો નિયમ શું છે?',
  ],
  ml: [
    'ഇന്ന് റേസർപേ വഴി ₹25,000 നൽകാം',
    'വാട്സാപ്പിൽ പേയ്മെന്റ് ലിങ്ക് അയക്കൂ',
    'ബാക്കി തുക 7 ദിവസത്തിനുള്ളിൽ നൽകാം',
    'MSMED നിയമം വകുപ്പ് 16 എന്താണ്?',
  ],
  pa: [
    'ਅੱਜ ਰੇਜ਼ਰਪੇਅ ਰਾਹੀਂ ₹25,000 ਕਲੀਅਰ ਕਰ ਸਕਦਾ ਹਾਂ',
    "ਵਟਸਐਪ 'ਤੇ ਭੁਗਤਾਨ ਲਿੰਕ ਭੇਜੋ",
    'ਬਾਕੀ ਬੈਲੇਂਸ 7 ਦਿਨਾਂ ਵਿੱਚ ਦੇਵਾਂਗਾ',
    'MSMED ਐਕਟ ਸੈਕਸ਼ਨ 16 ਦਾ ਕੀ ਨਿਯਮ ਹੈ?',
  ],
  or: [
    'ଆଜି ରେଜରପେ ଜରିଆରେ ₹୨୫,୦୦୦ ଦେଇପାରିବି',
    'ହ୍ୱାଟ୍ସଆପ୍‌ରେ ପେମେଣ୍ଟ ଲିଙ୍କ୍ ପଠାନ୍ତୁ',
    'ବାକି ଟଙ୍କା ୭ ଦିନରେ ଦେବି',
    'MSMED ଆଇନ ଧାରା ୧୬ ନିୟମ କ’ଣ?',
  ],
  ne: [
    'आज रेजरपेबाट ₹२५,००० चुक्ता गर्न सक्छु',
    'ह्वाट्सएपमा भुक्तानी लिङ्क पठाउनुहोस्',
    'बाँकी रकम ७ दिनमा चुक्ता गर्छु',
    'MSMED ऐन धारा १६ को नियम के हो?',
  ],
  as: [
    'আজি ৰেজৰপেৰে ₹২৫,০০০ পৰিশোধ কৰিব পাৰোঁ',
    'হোৱাটছএপত লিংক পঠিয়াওক',
    'বাকীখিনি ৭ দিনৰ ভিতৰত দিম',
    'MSMED আইন ধাৰা ১৬ৰ নিয়ম কি?',
  ],
  ur: [
    'آج ریزرپے سے ₹25,000 ادا کر سکتا ہوں',
    'واٹس ایپ پر ادائیگی کا لنک بھیجیں',
    'باقی رقم 7 دنوں میں ادا کروں گا',
    'ایم ایس ایم ای ڈی ایکٹ سیکشن 16 کا اصول کیا ہے؟',
  ],
  mai: [
    'आइझ रेजरपे सं ₹25,000 चुकता कऽ सकैत छी',
    'व्हाट्सएप पर पेमेंट लिंक पठाउ',
    'बाकी 7 दिन में दऽ देब',
    'MSMED एक्ट धारा 16 के नियम की अछि?',
  ],
};

/**
 * Translates text via Bhashini API (with zero-failure offline fallback)
 */
export async function translateTextBhashini(
  text: string,
  targetLang: string,
  sourceLang: string = 'en'
): Promise<string> {
  if (!text || targetLang === sourceLang) return text;

  try {
    const res = await fetch('/api/bhashini/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, targetLang, sourceLang }),
    });

    if (res.ok) {
      const data = await res.json();
      return data.translatedText || text;
    }
  } catch (err) {
    console.debug('[Bhashini Translation Client]:', err);
  }

  return text;
}
